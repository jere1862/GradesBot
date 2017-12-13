#!/bin/sh
aws ec2 run-instances \
--image-id ami-d29e25b6 \
--security-group-ids sg-e478d08c \
--count 1 \
--instance-type t2.micro \
--key-name Gel-Scraper-Canada \
--user-data file://deploy.sh \
--query 'Instances[0].InstanceId' 
