## deploy

sam build && sam deploy \
--template-file .aws-sam/build/template.yaml \
--stack-name sam-app \
--capabilities CAPABILITY_IAM \
--s3-bucket aws-sam-cli-managed-default-samclisourcebucket-q2x07r4pguy4

## invoke

sam build && sam local invoke --event events/event.json --env-vars events/envars.json --docker-network local-util_default

## db connect

psql -h stage.cluster-ca8to69alblg.us-east-2.rds.amazonaws.com -p 5432  -U postgres -W
