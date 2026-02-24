import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export class AwsSdkV2Layer extends Construct {
  public readonly layer: lambda.LayerVersion;
  constructor(scope: Construct, id: string) {
    super(scope, id);
    this.layer = new lambda.LayerVersion(this, 'AwsSdkV2', {
      code: lambda.Code.fromAsset('layers/aws-sdk-v2'),
      compatibleRuntimes: [lambda.Runtime.NODEJS_18_X],
      description: 'AWS SDK v2 for Node.js (Layer: nodejs/node_modules/aws-sdk)',
    });
  }
}
