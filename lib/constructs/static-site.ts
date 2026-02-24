import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
// no s3deploy to avoid assets during deploy

export interface StaticSiteProps {
  apiDomainName: string;
  apiStagePath: string;
  region: string;
}

export class StaticSite extends Construct {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: StaticSiteProps) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `imhere-site-${cdk.Stack.of(this).account}-${cdk.Stack.of(this).region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    const oai = new cloudfront.OriginAccessIdentity(this, 'OAI');
    const s3Origin = new origins.S3Origin(this.bucket, {
      originAccessIdentity: oai
    });

    const apiOrigin = new origins.HttpOrigin(props.apiDomainName, {
      originPath: props.apiStagePath,
    });

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        'location*': {
          origin: apiOrigin,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        }
      }
    });

    // Upload web content manually via 'aws s3 sync' to avoid CDK assets
    new cdk.CfnOutput(this, 'SiteURL', { value: `https://${this.distribution.domainName}` });
    new cdk.CfnOutput(this, 'SiteBucketName', { value: this.bucket.bucketName });
  }
}
