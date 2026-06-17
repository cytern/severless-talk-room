import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';

export interface ChatTagSearchFunctionProps {
  tableName: string;
  tagsTableName: string;
  layers?: lambda.ILayerVersion[];
}

export class ChatTagSearchFunction extends Construct {
  public readonly fn: lambda.IFunction;

  constructor(scope: Construct, id: string, props: ChatTagSearchFunctionProps) {
    super(scope, id);
    this.fn = new lambda.Function(this, 'Fn', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('bin/lambda/chat/tag-search'),
      timeout: cdk.Duration.seconds(10),
      environment: {
        TABLE_NAME: props.tableName,
        TAGS_TABLE_NAME: props.tagsTableName
      },
      layers: props.layers
    });
  }
}
