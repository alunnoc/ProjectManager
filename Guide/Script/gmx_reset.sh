#!/bin/bash

hex_add() {
    local hex1=$1
    local hex2=$2
    local _res=$3
    local int_tmp=`echo $(($hex1+$hex2))`
    #local var_name=$( printf "%08x" $int_tmp )
    local var_name=`printf %X $int_tmp`      # var_name=$( printf "%08x" $int_tmp )
    eval $_res="'$var_name'"
    return 0

}

NODE_ID=$1
DATA=41
RST_DATA=
for i in {0..63};
do
	if [ $(($i % 26)) == 0 ];then
	    DATA=41
	else
	    hex_add 0x$DATA 0x1 DATA
        fi;
	RST_DATA=$RST_DATA"\\"x$DATA
done;

echo $RST_DATA
#hex=$(xxd -pu <<< "$RST_DATA")
#ip addr add 192.168.40.100/24 dev gmx_service
echo -n -e "$RST_DATA" | nc -s 192.168.40.100 -u 192.168.40.110 54321 &
echo -n -e "$RST_DATA" | nc -s 192.168.40.100 -u 192.168.40.111 54321 &
