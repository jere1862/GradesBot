#!/bin/bash

if [ -z "$1" ]
then
    sudo docker-compose build
    sudo docker-compose up
else
    sudo docker-compose build "$1"
    sudo docker-compose up --no-deps -d "$1"
fi

