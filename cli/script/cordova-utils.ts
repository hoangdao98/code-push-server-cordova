import * as which from "which";
import * as xml2js from "xml2js";
import * as fs from "fs";
import * as path from "path";
import * as childProcess from "child_process";
import { log } from "./command-executor";
import chalk = require("chalk");

/**
 * Gets the Cordova project version from config.xml
 */
export function getCordovaProjectAppVersion(command: any, projectRoot?: string): Promise<string> {
  log(chalk.cyan(`Detecting ${command.platform} app version:\n`));
  // Check for targetBinaryVersion first
  if (command?.targetBinaryVersion) {
    return Promise.resolve(command.targetBinaryVersion);
  }

  // Fallback to reading config.xml
  return new Promise<string>((resolve, reject) => {
    const configPath = path.join(process.cwd(), "config.xml");
    
    try {
      const configString = fs.readFileSync(configPath, "utf-8");
      
      xml2js.parseString(configString, (err: Error, parsedConfig: any) => {
        if (err || !parsedConfig || !parsedConfig.widget) {
          reject(new Error(
            `Unable to parse "config.xml" in the CWD. Ensure that the contents of "config.xml" is valid.`
          ));
          return;
        }

        const version = parsedConfig.widget["$"].version;
        if (!version) {
          reject(new Error('The "config.xml" file does not have a valid version attribute.'));
          return;
        }

        resolve(version);
      });

    } catch (error) {
      reject(new Error(
        `Unable to find or read "config.xml" in the CWD. The "release-cordova" command must be executed in a Cordova project folder.`
      ));
    }
  });
}

/**
 * Validates if OS is supported
 */
export function isValidOS(os: string): boolean {
  switch (os.toLowerCase()) {
    case "android":
    case "ios":
      return true;
    default:
      return false;
  }
}

/**
 * Validates if platform is Cordova
 */
export function isValidPlatform(platform: string): boolean {
  return platform.toLowerCase() === "cordova";
}

/**
 * Gets the Cordova or PhoneGap CLI path
 */
export function getCordovaOrPhonegapCLI(): string {
  let cordovaCLI: string = "cordova";
  try {
    which.sync(cordovaCLI);
    return cordovaCLI;
  } catch (e) {
    cordovaCLI = "phonegap";
    which.sync(cordovaCLI);
    return cordovaCLI;
  }
}

/**
 * Gets the output folder based on platform
 */
export function getOutputFolder(os: string, projectRoot?: string): string {
  projectRoot = projectRoot || process.cwd();
  const platformFolder: string = path.join(projectRoot, "platforms", os);

  if (os === "ios") {
    return path.join(platformFolder, "www");
  } else if (os === "android") {
    // Since cordova-android 7 assets directory moved to android/app/src/main/assets instead of android/assets
    const outputFolderVer7 = path.join(platformFolder, "app", "src", "main", "assets", "www");
    const outputFolderPre7 = path.join(platformFolder, "assets", "www");
    if (fs.existsSync(outputFolderVer7)) {
      return outputFolderVer7;
    } else if (fs.existsSync(outputFolderPre7)) {
      return outputFolderPre7;
    }
  }
  throw new Error(`${os} output folder does not exist`);
}

/**
 * Checks if directory exists
 */
export function directoryExistsSync(dirname: string): boolean {
  try {
    return fs.statSync(dirname).isDirectory();
  } catch (err) {
    if (err.code === "ENOENT") {
      return false;
    }
    throw err;
  }
}

/**
 * Execute Cordova command
 */
export function execCordovaCommand(command: string, os: string): void {
  const cordovaCLI = getCordovaOrPhonegapCLI();
  try {
    childProcess.execSync([cordovaCLI, command, os, "--verbose"].join(" "), { stdio: "inherit" });
  } catch (error) {
    throw new Error(`Failed to execute ${command} for ${os} platform`);
  }
}