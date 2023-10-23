@REM Save current path to use later within .bat
cmd
SET GIS_PLATFORM_PATH=%CD%

@REM ##########################################
@REM # MANUAL STEP: find and open OSGeo4W.bat
@REM ##########################################
"C:\Program Files\QGIS 3.32.3\osgeo4w.bat"


pushd %GIS_PLATFORM_PATH%
@REM This is a comment...

@REM Move to the base directory of gis_platform
SET FILE_NAME=gedi_carbon
SET INPUT_FILE=server/%FILE_NAME%.tif

gdaldem color-relief -of vrt -alpha %INPUT_FILE% transformations/colors.txt transformations/colorized.vrt
gdal2tiles --zoom=1-12 -w leaflet -r average -d -s EPSG:6933 --xyz --processes 3 -n transformations/colorized.vrt ./tms/%FILE_NAME%/
gdal2tiles --zoom=13 -w leaflet -r near -d -s EPSG:6933 --xyz --processes 3 -n transformations/colorized.vrt ./tms/%FILE_NAME%/