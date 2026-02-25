map -l 0xf740194c =0x52443190;
map -l 0xf740194c =0x0;
echo "Temperature Sensor ";
map -l 0xf7401983;

map -l 0xf7401970 =0x0002bc00; #i pirmi 2 byte sono l'indirizzo di memoria della spi, il terzo byte è il dato
map -l 0xf740194c =0x0;
map -l 0xf740194c =0x575233ac; #scrivo 3 byte, indirizzo + dato
map -l 0xf740194c =0x0;
map -l 0xf740194c =0x575232ac; #scrivo 2 byte => l'indirizzo
map -l 0xf740194c =0x0;
map -l 0xf740194c =0x524431ac; #leggo 1 byte  a quell'indirizzo
echo "Eeprom Sensor ";
map -l 0xf7401970;
map -l 0xf7401983;
