#!/bin/sh
cd /home/claude/profab_study
while ! grep -q ALLDONE logs/driver.log; do sleep 10; done
echo "start proxy_cross $(date +%T)" >> logs/driver2.log
python3 -I -W ignore src/proxy_cross.py > logs/proxy_cross.log 2>&1
echo "end proxy_cross $(date +%T) rc=$?" >> logs/driver2.log
