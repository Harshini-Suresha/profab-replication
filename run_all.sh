#!/bin/sh
cd /home/claude/profab_study
for s in bench controlled_cv pruning stock_loader; do
  echo "start $s $(date +%T)" >> logs/driver.log
  python3 -I -W ignore src/$s.py > logs/$s.log 2>&1
  echo "end $s $(date +%T) rc=$?" >> logs/driver.log
done
echo ALLDONE >> logs/driver.log
