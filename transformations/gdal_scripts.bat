gdal-dev-py-env
SET GEDI_PATH=%USERPROFILE%\Downloads\GEDI04_B_MW019MW138_02_002_05_R01000M_V2.tif


pushd ${env:USERPROFILE}\Downloads
rmdir /s /q tms
gdal_translate -ot Float32 -co COMPRESS=LZW -projwin -12406327 5765229 -6630352 2870572 "%GEDI_PATH%" server/output.tif
gdaldem color-relief -of vrt -alpha server/output.tif transformations/colors.txt transformations/colorized.vrt

gdal2tiles --zoom=1-6 -w leaflet -r average -d -s EPSG:6933 --xyz --processes 3 -n transformations/colorized.vrt ./tms/
gdal2tiles --zoom=7 -w leaflet -r near -d -s EPSG:6933 --xyz --processes 3 -n transformations/colorized.vrt ./tms/