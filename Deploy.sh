aws ec2 run-instances \
--image-id ami-d29e25b6 \
--security-group-ids ami-d29e25b6 \
--count 1 \
--instance-type t2.micro \
--key-name Gel-Scraper-Canada \
--user-data install.sh
--query 'Instances[0].InstanceId'
