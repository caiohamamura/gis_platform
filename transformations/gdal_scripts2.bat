@REM Save current path to use later within .bat
$env:GIS_PLATFORM_PATH = ${PWD}.Path

@REM ##########################################
@REM # MANUAL STEP: find and open OSGeo4W.bat
@REM ##########################################

SET GIS_PLATFORM_PATH = %USERPROFILE%\gis_platform
pushd %GIS_PLATFORM_PATH%

SET VAR=20240116_test_36_2022_mean

@REM Move to the base directory of gis_platform
@REM SET INPUT_FILE=server/%VAR%.tif

@REM This is a comment...
@REM gdal_translate -ot Float32 -co COMPRESS=LZW -projwin -12406327 5765229 -6630352 2870572 "%GEDI_PATH%" server/output.tif

@REM gdaldem color-relief -of vrt -alpha %INPUT_FILE% transformations/colors_agbd.txt transformations/colorized.vrt

@REM gdal2tiles --zoom=1-12 -w leaflet -r average -d -s EPSG:4326 --xyz --processes 3 -n transformations/colorized.vrt ./tms/%VAR%/
@REM gdal2tiles --zoom=13 -w leaflet -r near -d -s EPSG:4326 --xyz --processes 3 -n transformations/colorized.vrt ./tms/%VAR%/

@REM SET VAR=20240116_test_36_2022_mean
@REM SET INPUT_FILE=server/%VAR%.tif
@REM gdaldem color-relief -of vrt -alpha %INPUT_FILE% transformations/colors_agbd_mean.txt transformations/colorized.vrt
@REM gdal2tiles --zoom=1-12 -w leaflet -r average -d -s EPSG:4326 --xyz --processes 3 -n transformations/colorized.vrt ./tms/%VAR%/
@REM gdal2tiles --zoom=13 -w leaflet -r near -d -s EPSG:4326 --xyz --processes 3 -n transformations/colorized.vrt ./tms/%VAR%/

@REM SET VAR=20240116_test_36_2023_mean
@REM SET INPUT_FILE=server/%VAR%.tif
@REM gdaldem color-relief -of vrt -alpha %INPUT_FILE% transformations/colors_agbd_mean.txt transformations/colorized.vrt
@REM gdal2tiles --zoom=1-12 -w leaflet -r average -d -s EPSG:4326 --xyz --processes 3 -n transformations/colorized.vrt ./tms/%VAR%/
@REM gdal2tiles --zoom=13 -w leaflet -r near -d -s EPSG:4326 --xyz --processes 3 -n transformations/colorized.vrt ./tms/%VAR%/

@REM SET VAR=20240116_test_36_2022_std
@REM SET INPUT_FILE=server/%VAR%.tif
@REM gdaldem color-relief -of vrt -alpha %INPUT_FILE% transformations/colors_agbd_std.txt transformations/colorized.vrt
@REM gdal2tiles --zoom=1-12 -w leaflet -r average -d -s EPSG:4326 --xyz --processes 3 -n transformations/colorized.vrt ./tms/%VAR%/
@REM gdal2tiles --zoom=13 -w leaflet -r near -d -s EPSG:4326 --xyz --processes 3 -n transformations/colorized.vrt ./tms/%VAR%/

@REM SET VAR=20240116_test_36_2023_std
@REM SET INPUT_FILE=server/%VAR%.tif
@REM gdaldem color-relief -of vrt -alpha %INPUT_FILE% transformations/colors_agbd_std.txt transformations/colorized.vrt
@REM gdal2tiles --zoom=1-12 -w leaflet -r average -d -s EPSG:4326 --xyz --processes 3 -n transformations/colorized.vrt ./tms/%VAR%/
@REM gdal2tiles --zoom=13 -w leaflet -r near -d -s EPSG:4326 --xyz --processes 3 -n transformations/colorized.vrt ./tms/%VAR%/

SET VAR=20240116_test_36_loss
SET INPUT_FILE=server/%VAR%.tif
gdaldem color-relief -of vrt -alpha %INPUT_FILE% transformations/colors_agbd_loss.txt transformations/colorized.vrt
gdal2tiles --zoom=1-12 -w leaflet -r average -d -s EPSG:4326 --xyz --processes 3 -n transformations/colorized.vrt ./tms/%VAR%/
gdal2tiles --zoom=13 -w leaflet -r near -d -s EPSG:4326 --xyz --processes 3 -n transformations/colorized.vrt ./tms/%VAR%/

@REM &"C:\Program Files\QGIS 3.34.2\OSGeo4W.bat"
@REM &'C:\Program Files\R\R-4.3.2\bin\x64\Rscript.exe' .\server\runner.R 
@REM pushd "C:\Users\ithomazbueno\gis_platform"