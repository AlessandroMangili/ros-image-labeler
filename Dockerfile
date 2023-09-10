FROM ubuntu:20.04

WORKDIR /app

COPY ./ .

SHELL ["/bin/bash", "-c"]

# Set local timezone
ENV TZ=Europe/Rome
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

ENV DEBIAN_FRONTEND=noninteractive

# nvm environment variables
ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 14.21.3

# add node and npm to path so the commands are available
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

RUN apt update \
    && apt install -y \
    curl \
	git \
	gnupg2 \
	cmake \
	lsb-release \
	python3-pip \
	python-is-python3 \
    && apt -y autoclean

# install nvm
RUN curl --silent -o- https://raw.githubusercontent.com/creationix/nvm/v0.31.2/install.sh | bash

# install node and npm
RUN source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

RUN npm install

# Install ros noetic and mongodb store and log packages
RUN sh -c 'echo "deb http://packages.ros.org/ros/ubuntu $(lsb_release -sc) main" > /etc/apt/sources.list.d/ros-latest.list' \ 
	&& curl -s https://raw.githubusercontent.com/ros/rosdistro/master/ros.asc | apt-key add - \ 
	&& apt update && apt -y install \
	ros-noetic-desktop \
	ros-noetic-mongodb-store \
	ros-noetic-mongodb-log 

RUN echo "source /opt/ros/noetic/setup.bash" >> ~/.bashrc && source ~/.bashrc

RUN pip install pymongo==2.7

CMD ["node", "./src/server.js"]