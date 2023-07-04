gdaldem color-relief /home/GEDI04_B_MW019MW138_02_002_05_R01000M_V2.tif /home/colors.txt /home/ougdaltput.tif -co "COMPRESS=LZW"


gdal-dev-py-env
pushd ${env:USERPROFILE}\Downloads
rmdir /s /q tms
gdal_translate -ot Float32 -co COMPRESS=LZW -projwin -12406327 5765229 -6630352 2870572 GEDI04_B_MW019MW138_02_002_05_R01000M_V2.tif output.tif

gdal2tiles --zoom=0-8 -w leaflet -r near -d -s EPSG:6933 --xyz --processes 3 -n output.tif ./tms/