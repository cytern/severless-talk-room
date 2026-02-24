import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { HelloApiStack } from '../lib/stack/hello-api-stack';

const app = new cdk.App();

const region = 'ap-east-1';

new HelloApiStack(app, 'HelloApiStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region,
  },
  synthesizer: new cdk.LegacyStackSynthesizer(),
});

app.synth();
