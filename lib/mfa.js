import Select from "enquirer/lib/prompts/select.js";
import Input from "enquirer/lib/prompts/input.js";
import ora from "ora";
import chalk from "chalk";
import { execa } from "execa";
import ini from "ini";
import { readFile, writeFile } from "fs/promises";
import { homedir } from "os";

const getMFADevicesFromAWS = async ({ user, profile }) => {
  const spinner = ora(chalk.blue("Getting MFA arn list form AWS...")).start();
  const listArnsCommandArgs = [
    "iam",
    "list-mfa-devices",
    "--user-name",
    user,
    ...(profile ? ["--profile", profile] : []),
  ];
  const { stdout: listArnsOutput } = await execa("aws", listArnsCommandArgs);
  const devices = JSON.parse(listArnsOutput).MFADevices;
  spinner.stop();
  return devices;
};

const getMFADeviceEnableDate = (device) => {
  const date = new Date(device.EnableDate);
  const enabled = date.toLocaleDateString() + " " + date.toLocaleTimeString();
  return enabled;
};

const choiceFromMFADevice = (device) => {
  const enabled = getMFADeviceEnableDate(device);
  return {
    name: `${device.SerialNumber} (Enabled ${enabled})`,
    value: device,
  };
};

const logSelectedMFADevice = (device) => {
  const enabled = getMFADeviceEnableDate(device);
  console.log(chalk.bold.blue("Using the following device for MFA:\n"));
  console.log(chalk.bold.blue("ARN:"), chalk.green(device.SerialNumber));
  console.log(chalk.bold.blue("Enabled:"), chalk.green(enabled));
  console.log();
};

const getMFADevice = async ({ user, profile }) => {
  const devices = await getMFADevicesFromAWS({ user, profile });
  if (devices.length === 0) {
    console.error("No MFA devices found for this user.");
    process.exit(1);
  }
  if (devices.length === 1) {
    logSelectedMFADevice(devices[0]);
    return devices[0].SerialNumber;
  }
  const prompt = new Select({
    name: "value",
    message: "Select a MFA device",
    limit: 7,
    choices: devices.map(choiceFromMFADevice),
    result(names) {
      return this.map(names);
    },
  });
  const device = await prompt.run();
  logSelectedMFADevice(device);
  return device.SerialNumber;
};

const getMFACode = async () => {
  return await new Input({ message: "Enter MFA code from the device" }).run();
};

const writeCredentials = async (
  profile,
  accessKeyId,
  secretAccessKey,
  sessionToken
) => {
  const credsPath = `${homedir()}/.aws/credentials`;
  const spinner = ora(chalk.blue("Writing credentials...")).start();
  const content = await readFile(credsPath, { encoding: "utf-8" });
  const config = ini.parse(content);
  const profileName = [profile, "mfa"].filter(Boolean).join("-");
  config[profileName] = {
    aws_access_key_id: accessKeyId,
    aws_secret_access_key: secretAccessKey,
    aws_session_token: sessionToken,
  };
  await writeFile(credsPath, ini.encode(config));
  spinner.stop();
  console.log(chalk.bold.green("\nSuccessfully wrote the MFA credentials."));
};

const loginWithMFA = async (arn, mfa, profile) => {
  const spinner = ora("Requesting session tokens...").start();
  const { stdout: mfaOutput } = await execa("aws", [
    "sts",
    "get-session-token",
    "--serial-number",
    arn,
    "--token-code",
    mfa,
    ...(profile ? ["--profile", profile] : []),
  ]);
  spinner.stop();
  const credentials = JSON.parse(mfaOutput).Credentials;
  writeCredentials(
    profile,
    credentials.AccessKeyId,
    credentials.SecretAccessKey,
    credentials.SessionToken
  );
};

export const requestMFA = async ({ user, profile }) => {
  const arn = await getMFADevice({ user, profile });
  const mfa = await getMFACode();
  loginWithMFA(arn, mfa, profile);
};
