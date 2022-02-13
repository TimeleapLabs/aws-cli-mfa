# AWS CLI MFA Helper

This tool makes doing MFA on the terminal a bit easier when working with AWS CLI tools.

## Installation

```bash
$ npm i -g @kenshi.io/aws-cli-mfa
```

## Usage

Run the following command to do an MFA auth:

```bash
$ aws-mfa <user> [profile]
```

Replace `<user>` with the name of the user, and `[profile]` with your profile.
Passing `profile` is not required.

This command then queries AWS for added MFA devices and asks you choose one if there
are more than one devices attached to your account. Once done, the tool asks for your
MFA code, if valid the tool writes your aws MFA credentials to a new profile which can
be used with AWS CLI tools.

The name of the newly created profile will be `${profile}-mfa` if a profile is passed,
otherwise it will be just named `mfa`.

## Example

```bash
$ aws-mfa john-doe acme
$ aws ecr get-login-password --profile acme-mfa | docker login ...
```
