import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as fs from 'fs';

export interface ChatWriteFunctionProps {
  tableName: string;
  layers?: lambda.ILayerVersion[];
}

export class ChatWriteFunction extends Construct {
  public readonly fn: lambda.Function;
  constructor(scope: Construct, id: string, props: ChatWriteFunctionProps) {
    super(scope, id);
    const logGroup = new logs.LogGroup(this, 'ChatWriteLog', {
      logGroupName: `/aws/lambda/hihere-send`,
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });
    this.fn = new lambda.Function(this, 'ChatWriteFn', {
      functionName: 'hihere-send',
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromInline(fs.readFileSync('bin/lambda/chat/write/index.js', 'utf8')),
      timeout: cdk.Duration.seconds(10),
      environment: {
        TABLE_NAME: props.tableName
      },
      layers: props.layers,
      logGroup
    });
    logGroup.grantWrite(this.fn);
  }
}
