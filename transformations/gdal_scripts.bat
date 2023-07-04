gdal-dev-py-env
SET GEDI_PATH=%USERPROFILE%\Downloads\GEDI04_B_MW019MW138_02_002_05_R01000M_V2.tif


pushd ${env:USERPROFILE}\Downloads
rmdir /s /q tms
gdal_translate -of vrt -ot Float32 -projwin -12406327 5765229 -6630352 2870572 "%GEDI_PATH%" transformations/clipped.vrt
gdaldem color-relief -of vrt -alpha transformations/clipped.vrt transformations/colors.txt transformations/colorized.vrt
gdal_translate -ot Float32 -co COMPRESS=LZW transformations/clipped.vrt server/output.tif

gdal2tiles --zoom=0-8 -w leaflet -r average -d -s EPSG:6933 --xyz --processes 3 -n transformations/colorized.vrt ./tms/