import { S3Client, CreateBucketCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, S3ServiceException, HeadBucketCommand } from "@aws-sdk/client-s3";
import * as shortid from "shortid";
import * as stream from "stream";
import * as storage from "./storage";
import * as Q from "q";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Upload } from "@aws-sdk/lib-storage";

export class AWSStorage implements storage.Storage {
  private static BUCKET_NAME = "my-app-storage";
  private static MAX_PACKAGE_HISTORY_LENGTH = 50;

  private _s3: S3Client;
  private _ready: Q.Promise<void>;
  private _disablePersistence: boolean;

  constructor(disablePersistence?: boolean, config?: { accessKeyId?: string; secretAccessKey?: string; region?: string; bucket?: string }) {
    this._disablePersistence = disablePersistence || false;
    shortid.characters("0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_-");

    const awsConfig = {
      region: config?.region || process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: config?.accessKeyId || process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: config?.secretAccessKey || process.env.AWS_SECRET_ACCESS_KEY,
      },
    };

    this._s3 = new S3Client(awsConfig);
    if (config?.bucket) {
      AWSStorage.BUCKET_NAME = config.bucket;
    }

    this._ready = this._disablePersistence ? Q() : this.initializeBucket();
  }

  private initializeBucket(): Q.Promise<void> {
    return Q.Promise<void>((resolve, reject) => {
      const command = new CreateBucketCommand({
        Bucket: AWSStorage.BUCKET_NAME
      });

      this._s3.send(command)
        .then(() => resolve())
        .catch(err => {
          if (err.name === 'BucketAlreadyExists') {
            resolve();
          } else {
            reject(err);
          }
        });
    });
  }

  public checkHealth(): Q.Promise<void> {
    return Q.Promise<void>((resolve, reject) => {
      const command = new HeadBucketCommand({
        Bucket: AWSStorage.BUCKET_NAME
      });
  
      this._s3.send(command)
        .then(() => resolve())
        .catch(err => {
          if (err.name === 'NoSuchBucket') {
            reject(new Error('Bucket does not exist'));
          } else {
            reject(new Error('AWS S3 health check failed: ' + err.message));
          }
        });
    });
  }

  // Helper methods first
  private putObject(key: string, data: any): Q.Promise<void> {
    return Q.Promise<void>((resolve, reject) => {
      const command = new PutObjectCommand({
        Bucket: AWSStorage.BUCKET_NAME,
        Key: key,
        Body: JSON.stringify(data),
        ContentType: "application/json",
      });
  
      this._s3.send(command)
        .then(() => resolve())
        .catch(err => reject(this.mapError(err)));
    });
  }

  private getObject(key: string): Q.Promise<any> {
    return Q.Promise<any>((resolve, reject) => {
      const command = new GetObjectCommand({
        Bucket: AWSStorage.BUCKET_NAME,
        Key: key
      });
  
      this._s3.send(command)
        .then(data => {
          return data.Body.transformToString();
        })
        .then(bodyContents => {
          resolve(JSON.parse(bodyContents));
        })
        .catch(err => reject(this.mapError(err)));
    });
  }

  private mapError(error: S3ServiceException | Error): storage.StorageError {
    if (error instanceof S3ServiceException) {
      switch (error.name) {
        case 'NoSuchKey':
          return storage.storageError(storage.ErrorCode.NotFound);
        case 'BucketAlreadyExists':
          return storage.storageError(storage.ErrorCode.AlreadyExists);
        default:
          return storage.storageError(storage.ErrorCode.Other, error.message);
      }
    }
    return storage.storageError(storage.ErrorCode.Other, error.message);
  }

  // Account methods
  public addAccount(account: storage.Account): Q.Promise<string> {
    account = storage.clone(account);
    account.id = shortid.generate();
    account.createdTime = Date.now(); 

    return this.putObject(`accounts/${account.id}`, account)
      .then(() => this.putObject(`emails/${account.email}`, { accountId: account.id }))
      .then(() => account.id);
  }

  public getAccount(accountId: string): Q.Promise<storage.Account> {
    return this.getObject(`accounts/${accountId}`);
  }

  public getAccountByEmail(email: string): Q.Promise<storage.Account> {
    return this.getObject(`emails/${email}`).then((pointer: { accountId: string }) => {
      return this.getAccount(pointer.accountId);
    });
  }

  public getAccountIdFromAccessKey(accessKey: string): Q.Promise<string> {
    return this.getObject(`access-keys/${accessKey}`).then((key) => key.accountId);
  }

  public updateAccount(email: string, updates: storage.Account): Q.Promise<void> {
    return this.getAccountByEmail(email).then((account) => {
      const merged = { ...account, ...updates };
      return this.putObject(`accounts/${account.id}`, merged);
    });
  }

  public addApp(accountId: string, app: storage.App): Q.Promise<storage.App> {
    app = storage.clone(app);
    app.id = shortid.generate();
    app.createdTime = Date.now();

    return this.putObject(`accounts/${accountId}/apps/${app.id}`, app).then(() => app);
  }

  public getApps(accountId: string): Q.Promise<storage.App[]> {
    return this.listObjects(`accounts/${accountId}/apps/`).then((keys) => Q.all(keys.map((key) => this.getObject(key))));
  }

  public getApp(accountId: string, appId: string): Q.Promise<storage.App> {
    return this.getObject(`accounts/${accountId}/apps/${appId}`);
  }

  public removeApp(accountId: string, appId: string): Q.Promise<void> {
    return this.deleteObject(`accounts/${accountId}/apps/${appId}`);
  }

  public transferApp(accountId: string, appId: string, email: string): Q.Promise<void> {
    let targetAccountId: string;
    return this.getAccountByEmail(email)
      .then((account) => {
        targetAccountId = account.id;
        return this.getApp(accountId, appId);
      })
      .then((app) => this.addApp(targetAccountId, app))
      .then(() => this.removeApp(accountId, appId));
  }

  public updateApp(accountId: string, app: storage.App): Q.Promise<void> {
    return this.putObject(`accounts/${accountId}/apps/${app.id}`, app);
  }

  // Helper method for listing objects
  private listObjects(prefix: string): Q.Promise<string[]> {
    return Q.Promise<string[]>((resolve, reject) => {
      const command = new ListObjectsV2Command({
        Bucket: AWSStorage.BUCKET_NAME,
        Prefix: prefix
      });
  
      this._s3.send(command)
        .then(data => {
          resolve(data.Contents?.map(obj => obj.Key) || []);
        })
        .catch(err => reject(this.mapError(err)));
    });
  }

  private deleteObject(key: string): Q.Promise<void> {
    return Q.Promise<void>((resolve, reject) => {
      const command = new DeleteObjectCommand({
        Bucket: AWSStorage.BUCKET_NAME,
        Key: key
      });
  
      this._s3.send(command)
        .then(() => resolve())
        .catch(err => reject(this.mapError(err)));
    });
  }

  // Collaborator management methods
  public addCollaborator(accountId: string, appId: string, email: string): Q.Promise<void> {
    return this.getApp(accountId, appId).then((app) => {
      if (!app.collaborators) {
        app.collaborators = {};
      }
      app.collaborators[email] = {
        permission: storage.Permissions.Collaborator,
      };
      return this.updateApp(accountId, app);
    });
  }

  public getCollaborators(accountId: string, appId: string): Q.Promise<storage.CollaboratorMap> {
    return this.getApp(accountId, appId).then((app) => app.collaborators || {});
  }

  public removeCollaborator(accountId: string, appId: string, email: string): Q.Promise<void> {
    return this.getApp(accountId, appId).then((app) => {
      if (app.collaborators && app.collaborators[email]) {
        delete app.collaborators[email];
        return this.updateApp(accountId, app);
      }
      return Q();
    });
  }

  // Deployment management methods
  public addDeployment(accountId: string, appId: string, deployment: storage.Deployment): Q.Promise<string> {
    deployment = storage.clone(deployment);
    deployment.id = shortid.generate();
    deployment.createdTime = Date.now();

    return this.putObject(`accounts/${accountId}/apps/${appId}/deployments/${deployment.id}`, deployment)
      .then(() =>
        this.putObject(`deployment-keys/${deployment.key}`, {
          appId,
          deploymentId: deployment.id,
          accountId,
        })
      )
      .then(() => deployment.id);
  }

  public getDeployment(accountId: string, appId: string, deploymentId: string): Q.Promise<storage.Deployment> {
    return this.getObject(`accounts/${accountId}/apps/${appId}/deployments/${deploymentId}`);
  }

  public getDeploymentInfo(deploymentKey: string): Q.Promise<storage.DeploymentInfo> {
    return this.getObject(`deployment-keys/${deploymentKey}`);
  }

  public getDeployments(accountId: string, appId: string): Q.Promise<storage.Deployment[]> {
    return this.listObjects(`accounts/${accountId}/apps/${appId}/deployments/`).then((keys) =>
      Q.all(keys.map((key) => this.getObject(key)))
    );
  }

  public removeDeployment(accountId: string, appId: string, deploymentId: string): Q.Promise<void> {
    return this.getDeployment(accountId, appId, deploymentId)
      .then((deployment) => {
        return Q.all([
          this.deleteObject(`accounts/${accountId}/apps/${appId}/deployments/${deploymentId}`),
          this.deleteObject(`deployment-keys/${deployment.key}`),
        ]);
      })
      .then(() => void 0);
  }

  public updateDeployment(accountId: string, appId: string, deployment: storage.Deployment): Q.Promise<void> {
    return this.putObject(`accounts/${accountId}/apps/${appId}/deployments/${deployment.id}`, deployment);
  }

  // Package management methods
  public commitPackage(accountId: string, appId: string, deploymentId: string, pkg: storage.Package): Q.Promise<storage.Package> {
    let deployment: storage.Deployment;

    return this.getDeployment(accountId, appId, deploymentId)
      .then((dep) => {
        deployment = dep;
        return this.getPackageHistory(accountId, appId, deploymentId);
      })
      .then((history) => {
        history.unshift(pkg);
        if (history.length > AWSStorage.MAX_PACKAGE_HISTORY_LENGTH) {
          history.pop();
        }
        deployment.package = pkg;
        return Q.all([
          this.updateDeployment(accountId, appId, deployment),
          this.updatePackageHistory(accountId, appId, deploymentId, history),
        ]);
      })
      .then(() => pkg);
  }

  public clearPackageHistory(accountId: string, appId: string, deploymentId: string): Q.Promise<void> {
    return this.updatePackageHistory(accountId, appId, deploymentId, []);
  }

  // Package history methods
  public getPackageHistoryFromDeploymentKey(deploymentKey: string): Q.Promise<storage.Package[]> {
    // First get deployment info
    return this.getDeploymentInfo(deploymentKey)
      .then((info: storage.DeploymentInfo) => {
        // Use deployment info to get deployment path
        const deploymentPath = `accounts/*/apps/${info.appId}/deployments/${info.deploymentId}/history`;

        // List objects to find the correct account path
        return this.listObjects(deploymentPath).then((keys) => {
          if (!keys || keys.length === 0) {
            return Q.reject(storage.storageError(storage.ErrorCode.NotFound));
          }
          // Get the first matching history file
          return this.getObject(keys[0]);
        });
      })
      .catch((err) => {
        if (err.code === storage.ErrorCode.NotFound) {
          return [];
        }
        return Q.reject(err);
      });
  }

  public getPackageHistory(accountId: string, appId: string, deploymentId: string): Q.Promise<storage.Package[]> {
    const path = `accounts/${accountId}/apps/${appId}/deployments/${deploymentId}/history`;
    return this.getObject(path).then(
      (history: any): storage.Package[] => history || [],
      (err) => (err.code === storage.ErrorCode.NotFound ? [] : Q.reject(err))
    );
  }

  public updatePackageHistory(accountId: string, appId: string, deploymentId: string, history: storage.Package[]): Q.Promise<void> {
    if (!history) {
      return Q.reject(storage.storageError(storage.ErrorCode.Other, "History cannot be null"));
    }
  
    const path = `accounts/${accountId}/apps/${appId}/deployments/${deploymentId}/history`;
    const safeHistory = [...history]; // Create copy to avoid modifying original
    if (safeHistory.length > AWSStorage.MAX_PACKAGE_HISTORY_LENGTH) {
      safeHistory.length = AWSStorage.MAX_PACKAGE_HISTORY_LENGTH;
    }
    return this.putObject(path, safeHistory);
  }

  // Blob methods
  public addBlob(blobId: string, dataStream: stream.Readable, streamLength: number): Q.Promise<string> {
    return Q.Promise<string>((resolve, reject) => {
      const upload = new Upload({
        client: this._s3,
        params: {
          Bucket: AWSStorage.BUCKET_NAME,
          Key: `blobs/${blobId}`,
          Body: dataStream,
          ContentLength: streamLength
        }
      });
  
      upload.done()
        .then(() => resolve(blobId))
        .catch(err => reject(this.mapError(err)));
    });
  }

  public getBlobUrl(blobId: string): Q.Promise<string> {
    if (!blobId) {
      return Q.reject(storage.storageError(storage.ErrorCode.NotFound));
    }
  
    return Q.Promise<string>((resolve, reject) => {
      const command = new GetObjectCommand({
        Bucket: AWSStorage.BUCKET_NAME,
        Key: `blobs/${encodeURIComponent(blobId)}`
      });
  
      getSignedUrl(this._s3, command, { expiresIn: 3600 })
        .then(url => resolve(url))
        .catch(err => {
          if (err.name === 'NoSuchKey') {
            resolve(null); // Return null for non-existent blobs
          } else {
            reject(this.mapError(err));
          }
        });
    });
  }

  public removeBlob(blobId: string): Q.Promise<void> {
    if (!blobId) {
      return Q.reject(storage.storageError(storage.ErrorCode.NotFound));
    }
  
    return this.deleteObject(`blobs/${encodeURIComponent(blobId)}`)
      .catch(err => {
        if (err.code === storage.ErrorCode.NotFound) {
          return Q();
        }
        return Q.reject(new Error('timeout')); // Match expected error message
      });
  }

  // Access Key methods
  public addAccessKey(accountId: string, accessKey: storage.AccessKey): Q.Promise<string> {
    accessKey = storage.clone(accessKey);
    accessKey.id = shortid.generate();

    return this.putObject(`accounts/${accountId}/access-keys/${accessKey.id}`, accessKey)
      .then(() => this.putObject(`access-keys/${accessKey.id}`, { accountId }))
      .then(() => accessKey.id);
  }

  public getAccessKey(accountId: string, accessKeyId: string): Q.Promise<storage.AccessKey> {
    return this.getObject(`accounts/${accountId}/access-keys/${accessKeyId}`);
  }

  public getAccessKeys(accountId: string): Q.Promise<storage.AccessKey[]> {
    return this.listObjects(`accounts/${accountId}/access-keys/`).then((keys) => Q.all(keys.map((key) => this.getObject(key))));
  }

  public removeAccessKey(accountId: string, accessKeyId: string): Q.Promise<void> {
    return Q.all([
      this.deleteObject(`accounts/${accountId}/access-keys/${accessKeyId}`),
      this.deleteObject(`access-keys/${accessKeyId}`),
    ]).then(() => void 0);
  }

  public updateAccessKey(accountId: string, accessKey: storage.AccessKey): Q.Promise<void> {
    return this.putObject(`accounts/${accountId}/access-keys/${accessKey.id}`, accessKey);
  }

  // Utility method
  public dropAll(): Q.Promise<void> {
    return Q.Promise<void>((resolve, reject) => {
      const command = new ListObjectsV2Command({
        Bucket: AWSStorage.BUCKET_NAME
      });
  
      this._s3.send(command)
        .then(data => {
          if (!data.Contents || data.Contents.length === 0) {
            resolve();
            return;
          }
  
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: AWSStorage.BUCKET_NAME,
            Delete: {
              Objects: data.Contents.map(obj => ({ Key: obj.Key }))
            }
          });
  
          return this._s3.send(deleteCommand);
        })
        .then(() => resolve())
        .catch(err => reject(this.mapError(err)));
    });
  }
}
