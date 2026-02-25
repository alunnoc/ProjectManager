#! /bin/sh

CCPREFIX=
PREV_ADDR_OFFS=5

if test ! \( -f "$1" -a -f "$2" \)
then
    echo "$(basename "$0"): error: file not found"
    echo "Usage: $(basename "$0") <image_file> <stacktrace>"
    exit 1
fi

while read -r line
do
    # start address is end addr - MAX_INSTR_SIZE
    start="$((0x$line - PREV_ADDR_OFFS))"

    ${CCPREFIX}objdump -d --start-address="$start" --stop-address="0x$line" "$1" | tail -n1
done < "$2"

exit 0
