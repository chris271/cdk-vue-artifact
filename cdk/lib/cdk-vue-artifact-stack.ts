import * as cdk from '@aws-cdk/core';
import * as core from '@aws-cdk/core';
import {CfnParameter} from '@aws-cdk/core';
import * as s3 from '@aws-cdk/aws-s3';
import * as pipeline from '@aws-cdk/aws-codepipeline'
import * as codebuild from '@aws-cdk/aws-codebuild'
import * as sns from '@aws-cdk/aws-sns'
import * as pipelineActions from '@aws-cdk/aws-codepipeline-actions'
import * as sm from "@aws-cdk/aws-secretsmanager";
import {CdkPipeline, SimpleSynthAction} from '@aws-cdk/pipelines';
import {Distribution, LambdaEdgeEventType, OriginAccessIdentity} from '@aws-cdk/aws-cloudfront';
import {S3Origin} from '@aws-cdk/aws-cloudfront-origins';
import {EdgeFunction} from "@aws-cdk/aws-cloudfront/lib/experimental";
import {Code, Runtime} from "@aws-cdk/aws-lambda";

// cdk deploy command: cdk deploy --parameters githubRepoName=<your-github-repo-name> --parameters githubBranch=<your-github-repo-branch> --parameters githubOwner=<your-github-owner-name> --parameters emailNotifications=<your-email-id>

export class CdkVueArtifactStack extends cdk.Stack {
    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const githubRepoName = new CfnParameter(this, 'githubRepoName', {
            type: 'String',
            description: ''
        });

        const githubBranch = new CfnParameter(this, 'githubBranch', {
            type: 'String',
            description: ''
        });

        const githubOwner = new CfnParameter(this, 'githubOwner', {
            type: 'String',
            description: ''
        });

        const emailNotifications = new CfnParameter(this, 'emailNotifications', {
            type: 'String',
            description: ''
        });

        // Creating S3 bucket with name vue-component-bucket
        const deployBucket = new s3.Bucket(this, 'VueComponentsBucket', {
            versioned: false,
            bucketName: `vue-component-bucket-${this.region}-${this.account}`,
            publicReadAccess: false,
            removalPolicy: core.RemovalPolicy.DESTROY
        });

        const oai = new OriginAccessIdentity(this, 'OriginAccessIdentity', {comment: "Origin Access Identity for Origin S3 bucket"});
        deployBucket.grantRead(oai);

        const edgeFunction = new EdgeFunction(this, 'BGEdgeFunction', {
            code: Code.fromAsset("lib/lambda"),
            handler: "ab-lambda-function.handler",
            runtime: Runtime.NODEJS_14_X
        });
        new Distribution(this, 'VueComponentDistribution', {
            defaultBehavior: {
                origin: new S3Origin(
                    deployBucket,
                    {originAccessIdentity: oai}
                ),
                edgeLambdas: [{
                    eventType: LambdaEdgeEventType.VIEWER_REQUEST,
                    functionVersion: edgeFunction
                }]
            },
            defaultRootObject: 'index.html'
        });

        // const pipelineArtifact = new pipeline.Artifact('RepoSource');
        // const buildArtifact = new pipeline.Artifact('BuildOutput');
        // const testBuild = new codebuild.PipelineProject(this, "TestBuild", {
        //     buildSpec: codebuild.BuildSpec.fromObject({
        //         version: "0.2",
        //         phases: {
        //             install: {
        //                 "runtime-versions": {
        //                     nodejs: 10
        //                 }
        //             },
        //             build: {
        //                 commands: [
        //                     "cd vue-web-component-app",
        //                     "npm install",
        //                     "npm run lint",
        //                     "npm run test"
        //                 ]
        //             }
        //         }
        //     }),
        //     environment: {
        //         buildImage: codebuild.LinuxBuildImage.STANDARD_4_0
        //     }
        // });
        // const runBuild = new codebuild.PipelineProject(this, "RunBuild", {
        //     buildSpec: codebuild.BuildSpec.fromObject({
        //         version: "0.2",
        //         phases: {
        //             install: {
        //                 "runtime-versions": {
        //                     nodejs: 10
        //                 }
        //             },
        //             build: {
        //                 commands: [
        //                     "cd vue-web-component-app",
        //                     "npm install",
        //                     "./node_modules/.bin/vue-cli-service build --target wc --inline-vue --name counter-app src/CounterApp.vue",
        //                     "mv dist ../dist",
        //                     "./node_modules/.bin/vue-cli-service build --target wc --inline-vue --name addition-app src/AdditionApp.vue",
        //                     "cp -a dist/. ../dist/",
        //                     "cp -a public/. ../dist/"
        //                 ]
        //             }
        //         },
        //         artifacts: {
        //             files: [
        //                 "**/*"
        //             ],
        //             "discard-paths": "no",
        //             "base-directory": "dist"
        //         }
        //     }),
        //     environment: {
        //         buildImage: codebuild.LinuxBuildImage.STANDARD_4_0
        //     }
        // });
        //
        // const pipelineNotificationTopic = new sns.Topic(this, 'ApprovalSnsTopic', {
        //     topicName: 'ApprovalSnsTopic'
        // });
        //
        // const vuePipeline = new pipeline.Pipeline(this, 'VueComponentPipeline', {
        //     pipelineName: 'VueComponentPipeline',
        //     stages: [
        //         {
        //             stageName: 'SourceStage',
        //             actions: [
        //                 new pipelineActions.GitHubSourceAction({
        //                     actionName: 'GitHubSource',
        //                     branch: githubBranch.valueAsString,
        //                     output: pipelineArtifact,
        //                     owner: githubOwner.valueAsString,
        //                     repo: githubRepoName.valueAsString,
        //                     oauthToken: sm.Secret.fromSecretName(this, 'MyGithubToken', 'my-github-token')
        //                         .secretValueFromJson('my-github-token'),
        //                     trigger: pipelineActions.GitHubTrigger.WEBHOOK,
        //                     runOrder: 1
        //                 })
        //             ]
        //         },
        //         {
        //             stageName: 'TestStage',
        //             actions: [
        //                 new pipelineActions.CodeBuildAction({
        //                     actionName: 'TestVue',
        //                     input: pipelineArtifact,
        //                     project: testBuild,
        //                     runOrder: 1
        //                 })
        //             ]
        //         },
        //         {
        //             stageName: 'BuildStage',
        //             actions: [
        //                 new pipelineActions.CodeBuildAction({
        //                     actionName: 'BuildVue',
        //                     input: pipelineArtifact,
        //                     outputs: [
        //                         buildArtifact
        //                     ],
        //                     project: runBuild,
        //                     runOrder: 1
        //                 })
        //             ]
        //         },
        //         {
        //             stageName: 'ApprovalStage',
        //             actions: [
        //                 new pipelineActions.ManualApprovalAction({
        //                     actionName: 'ApproveDeploy',
        //                     notifyEmails: [
        //                         emailNotifications.valueAsString
        //                     ],
        //                     additionalInformation: 'Approve Deployment to S3?',
        //                     externalEntityLink: `https://github.com/${githubOwner.valueAsString}/${githubRepoName.valueAsString}`,
        //                     notificationTopic: pipelineNotificationTopic,
        //                     runOrder: 1
        //                 })
        //             ]
        //         },
        //         {
        //             stageName: 'DeployStage',
        //             actions: [
        //                 new pipelineActions.S3DeployAction({
        //                     actionName: 'DeployVue',
        //                     bucket: deployBucket,
        //                     input: buildArtifact
        //                 })
        //             ]
        //         }
        //     ]
        // });

        const pipelineArtifact = new pipeline.Artifact('RepoSource');
        const buildArtifact = new pipeline.Artifact('BuildOutput');
        const pipelineNotificationTopic = new sns.Topic(this, 'ApprovalSnsTopic', {
            topicName: 'ApprovalSnsTopic'
        });
        const sourceAction = new pipelineActions.GitHubSourceAction({
            actionName: 'GitHubSource',
            branch: githubBranch.valueAsString,
            output: pipelineArtifact,
            owner: githubOwner.valueAsString,
            repo: githubRepoName.valueAsString,
            oauthToken: sm.Secret.fromSecretName(this, 'MyGithubToken', 'my-github-token')
                .secretValueFromJson('my-github-token'),
            trigger: pipelineActions.GitHubTrigger.WEBHOOK,
            runOrder: 1
        });
        const synthAction = SimpleSynthAction.standardNpmSynth({
            sourceArtifact: pipelineArtifact,
            cloudAssemblyArtifact: buildArtifact,
            subdirectory: 'vue-web-component-app',
            testCommands: [
                'npm run lint',
                'npm run test'
            ]
        });
        const vuePipeline = new CdkPipeline(this, 'VueComponentCdkPipeline', {
            pipelineName: 'VueComponentPipeline',
            cloudAssemblyArtifact: pipelineArtifact,
            synthAction: synthAction,
            sourceAction: sourceAction
        });

        const approvalStage = vuePipeline.addStage('ApprovalStage');
        approvalStage.addActions(new pipelineActions.ManualApprovalAction({
            actionName: 'ApproveDeploy',
            notifyEmails: [
                emailNotifications.valueAsString
            ],
            additionalInformation: 'Approve Deployment to S3?',
            externalEntityLink: `https://github.com/${githubOwner.valueAsString}/${githubRepoName.valueAsString}`,
            notificationTopic: pipelineNotificationTopic,
            runOrder: 1
        }));
        const deployStage = vuePipeline.addStage('DeployStage');
        deployStage.addActions(new pipelineActions.S3DeployAction({
            actionName: 'DeployVue',
            bucket: deployBucket,
            input: buildArtifact
        }));
    }
}
