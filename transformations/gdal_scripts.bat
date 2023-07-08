@REM Save current path to use later within .bat
$env:GIS_PLATFORM_PATH = ${PWD}.Path

@REM ##########################################
@REM # MANUAL STEP: find and open OSGeo4W.bat
@REM ##########################################


@REM Move to the base directory of gis_platform
SET GIS_PLATFORM_PATH = %USERPROFILE%\gis_platform
SET INPUT_FILE=server/gedi_carbon.tif

pushd %GIS_PLATFORM_PATH%
@REM This is a comment...
@REM gdal_translate -ot Float32 -co COMPRESS=LZW -projwin -12406327 5765229 -6630352 2870572 "%GEDI_PATH%" server/output.tif

gdaldem color-relief -of vrt -alpha server/gedi_carbon.tif transformations/colors.txt transformations/colorized.vrt

gdal2tiles --zoom=1-6 -w leaflet -r average -d -s EPSG:6933 --xyz --processes 3 -n transformations/colorized.vrt ./tms/gedi_carbon/
gdal2tiles --zoom=7 -w leaflet -r near -d -s EPSG:6933 --xyz --processes 3 -n transformations/colorized.vrt ./tms/gedi_carbon/