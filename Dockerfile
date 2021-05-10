FROM tiangolo/uwsgi-nginx-flask:python3.7

ENV LISTEN_PORT 3134
EXPOSE 3134
ENV PYTHONPATH=$PYTHONPATH:/app/python/
ENV PYTHONPATH=$PYTHONPATH:/app/
ENV STATIC_PATH /app/web/static
ENV NGINX_MAX_UPLOAD 500m

COPY ./uwsgi.ini /app/
COPY ./python /app/python
COPY ./web /app/web
COPY ./requirements.txt /app/
RUN apt-get clean && apt-get update && apt-get -y install cmake ca-certificates vim
RUN pip3 install -r /app/requirements.txt
RUN mkdir opensmile && cd opensmile && wget https://github.com/audeering/opensmile/releases/download/v3.0.0/opensmile-3.0-linux-x64.tar.gz && tar -xzvf opensmile-3.0-linux-x64.tar.gz && mv opensmile-3.0-linux-x64/* .

WORKDIR /app/web