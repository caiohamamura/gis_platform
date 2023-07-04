from osgeo import gdal
import numpy as np

tif = gdal.Open('output.tif')
band = tif.GetRasterBand(1)
band.GetBlockSize() 

blocks = (np.array([band.XSize, band.YSize], dtype=np.int32) / band.GetBlockSize()).astype(np.int32)

mean = 0
n = 0
nBlocksTime = 1

for x in range(blocks[0]):
    for y in range(0,blocks[1],nBlocksTime):
        data = band.ReadAsArray(int(x * blocks[1]), int(y * blocks[0]), int(blocks[1] * nBlocksTime), int(blocks[0]))
        partialMean = data[data != band.GetNoDataValue()].mean()
        partialN = data.size
        if (n == 0):
            mean = partialMean
            n = partialN
        else :
            mean = mean * (n / (n + partialN)) + partialMean * (partialN / (n + partialN))
            n += partialN

print(mean)