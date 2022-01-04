sam build && sam deploy \
--template-file .aws-sam/build/template.yaml \
--stack-name sam-app \
--capabilities CAPABILITY_IAM \
--s3-bucket aws-sam-cli-managed-default-samclisourcebucket-q2x07r4pguy4
