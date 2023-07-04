library(plumber)
library(raster)
library(glue)
# Filters

#* @filter cors
cors <- function(res) {
    res$setHeader("Access-Control-Allow-Origin", "*")
    plumber::forward()
}

r = terra::rast('output.tif')


# Define the API endpoints

#* Apply function
#* Example usage: http://localhost:9000/api?bbox=6,8,7,9&layer=carbon
#* @param bbox Bounding box
#* @param layer The layer name
#* @get /api
api <- function(bbox, layer) {
  # Retrieve the 'bbox' parameter from the query string
  
  # Split the parameter into a numeric vector
  bbox <- as.numeric(strsplit(bbox, ",")[[1]])

  extent = glue::glue("SRID=4326;LINESTRING({bbox[1]} {bbox[2]}, {bbox[3]} {bbox[4]})")
  trans = sf::st_transform(sf::st_as_sfc(extent), crs=6933)
  bbox = sf::st_bbox(trans)
  clip = terra::crop(r, bbox)
  mean = terra::global(clip, fun='mean', na.rm=T)
  
  # Return a JSON response
  response <- list(
    mean = mean$mean
  )
  return(response)
}