# Clone the repo
git clone https://github.com/caiohamamura/gis_platform
cd gis_platform

# Install nginx (serves the files to the web)
sudo apt update
sudo apt install nginx -y

# Start nginx, to stop run `sudo service nginx stop`
sudo bash -c 'sed "s/PWD/${PWD//\//\\/}/g" nginx.conf > /etc/nginx/sites-available/default'
sudo chmod 701 ~
sudo systemctl daemon-reload
sudo systemctl enable nginx
sudo service nginx start

################
## Install R
################
# update indices
# install two helper packages we need
sudo apt install --no-install-recommends software-properties-common dirmngr -y
# add the signing key (by Michael Rutter) for these repos
# To verify key, run gpg --show-keys /etc/apt/trusted.gpg.d/cran_ubuntu_key.asc 
# Fingerprint: E298A3A825C0D65DFD57CBB651716619E084DAB9
wget -qO- https://cloud.r-project.org/bin/linux/ubuntu/marutter_pubkey.asc | sudo tee -a /etc/apt/trusted.gpg.d/cran_ubuntu_key.asc
# add the R 4.0 repo from CRAN -- adjust 'focal' to 'groovy' or 'bionic' as needed
sudo add-apt-repository "deb https://cloud.r-project.org/bin/linux/ubuntu $(lsb_release -cs)-cran40/" -y



sudo apt install --no-install-recommends r-base -y

################
## Install binary R packages
################
sudo add-apt-repository ppa:c2d4u.team/c2d4u4.0+ -y
sudo apt install r-cran-plumber r-cran-terra r-cran-sf r-cran-glue r-cran-geojsonsf -y


###############
## Install the R server as a service
###############
sudo bash -c 'sed "s/PWD/${PWD//\//\\/}/g" rserver.service.template > /etc/systemd/system/rserver.service'
sudo systemctl daemon-reload
sudo systemctl enable rserver 
sudo service rserver start
