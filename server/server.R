library(pacman)
pacman::p_load(
  plumber,
  terra,
  sf,
  glue,
  geojsonsf
)

rasters = list(
  gedi_carbon = terra::rast('gedi_carbon.tif'),
  gedi_carbon2 = terra::rast('gedi_carbon.tif')
)


# Filters
#* @filter cors
cors <- function(res) {
    res$setHeader("Access-Control-Allow-Origin", "*")
    plumber::forward()
}


# Define the API endpoints
#* Apply function
#* Example usage: http://localhost:9000/api?bbox=6,8,7,9&layer=carbon
#* @param bbox Bounding box
#* @param layer The layer name
#* @get /api
api <- function(bbox, layer = 'gedi_carbon') {
  message(layer)
  # Retrieve the 'bbox' parameter from the query string
  
  # Split the parameter into a numeric vector
  bbox <- as.numeric(strsplit(bbox, ",")[[1]])

  line = glue::glue("LINESTRING({bbox[1]} {bbox[2]}, {bbox[3]} {bbox[4]})")
  lineVect = terra::vect(line)
  crs(lineVect) = 'epsg:4326'
  trans = terra::project(lineVect, crs(rasters[[layer]]))
  bbox = terra::ext(trans)
  clip = terra::crop(rasters[[layer]], bbox)
  mean = terra::global(clip, fun='mean', na.rm=T)
  
  # Return a JSON response
  response <- list(
    mean = mean$mean
  )
  return(response)
}

#* Apply polygon
#* Example usage: http://localhost:9000/polygon?wkt=<polygonWKT>&layer=carbon
#* @param wkt The wkt from the polygon
#* @param layer The layer name
#* @get /polygon
polygon <- function(wkt, layer = 'gedi_carbon') {
  message(layer)
    # Create a terra polygon from the WKT
    poly <- terra::vect(wkt)
    
    # Set the original coordinate reference system (crs) to 4326
    crs(poly) <- '+init=epsg:4326'
    
    # Reproject the polygon to CRS 6933
    poly <- project(poly, crs(rasters[[layer]]))
    
    # Crop the raster 'r' using the polygon
    cropped_raster <- crop(rasters[[layer]], poly)
    masked_raster <- mask(cropped_raster, poly)
    
    # Calculate the global mean
    mean_value <- terra::global(cropped_raster, fun='mean', na.rm=T)
    
    # Create a list with the mean value
    return(list(
      mean = mean_value$mean
    ))
}

#* Apply polygon geojson
#* Example usage: http://localhost:9000/
#* @param geojson:[geojson] The geojson from the polygon
#* @post /geojson
geojson <- function(req, geojson, layer = 'gedi_carbon') {
    # Create a terra polygon from the WKT

    poly <- sf::st_read(req$body)
    
    # Reproject the polygon to CRS 6933
    poly <- sf::st_transform(poly, crs=crs(rasters[[layer]]))
    
    # Crop the raster 'r' using the polygon
    cropped_raster <- crop(rasters[[layer]], poly)
    masked_raster <- mask(cropped_raster, poly)
    
    # Calculate the global mean
    mean_value <- terra::global(cropped_raster, fun='mean', na.rm=T)
    
    # Create a list with the mean value
    return(list(
      mean = mean_value$mean
    ))
}

#* @param file:[file]
#* @post /upload
function(file, layer = 'gedi_carbon') {
  message(layer)
  tmp = paste0(tempfile(), '.zip')
  writeBin(file[[names(file)]], tmp)

  tempdir = dirname(tmp)
  unzip(tmp, exdir=tempdir)

  shp = file.path(tempdir, list.files(tempdir, pattern='*.shp')[1])
  shp = sf::st_read(shp)
  
  on.exit({
    unlink(tempdir, recursive = T)
  })
  
  transformed = sf::st_transform(shp, crs=crs(rasters[[layer]]))
  clippedRaster = terra::crop(rasters[[layer]], transformed)
  maskedRaster = terra::mask(clippedRaster, transformed)
  mean = terra::global(maskedRaster, fun='mean', na.rm=T)
  # Return a JSON response
  response <- list(
    mean = mean$mean,
    geojson = sf_geojson(shp)
  )

  unlink(tempdir, recursive=T)
  return(response)  
}

