#!/bin/bash

#set GPIO as output
I2C_BUS=1 

    
i2cset -y $I2C_BUS 0x21 0x6 0x00
i2cset -y $I2C_BUS 0x21 0x7 0x00

#set GPIO value to 1
i2cset -y $I2C_BUS 0x21 0x3 0x40

for i in {1..32}
do
    #set GPIO value to 0
    i2cset -y $I2C_BUS 0x21 0x3 0x00
    #set GPIO value to 1
    i2cset -y $I2C_BUS 0x21 0x3 0x40
    echo "pulse $i"
done
