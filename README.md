# Web tool for Labeling

Semplice web app che permette di caricare file bag. estrarre il contenuto e mostrare tutte le immagini divise per topic al fine di poterle annotare creando cosi un set di immagini labellate.

Per ogni file bag viene creata un'istanza docker di ([MongoDB](https://www.mongodb.com)), all'interno del quale verranno salvate tutte le inforamzioni relativi al contenuto del file e all'annotazione delle immagini.

## Installazione

Prima di iniziare, bisogna installare [Docker](https://www.docker.com/products/docker-desktop/) sulla propria macchina. Una volta installato, è sufficiente avviare il servizio docker se lo si sta utilizzando da riga di comando, e costruire l'immagine docker relativa all'app; per fare questo è sufficiente:
```
$ cd WebToolLabelImage
$ docker build -t nome_immagine .
```
una volta finito di costruire l'immagine, avviamo un container tramite il comando
```
$ docker run -v ./:/app -p 8000:8000 nome_immagine
```
e ora siamo proonti ad utilizzare la web app.

---

## English

A simple web app that allows you to upload a bag file, extract its contents and save all the images and then show them, ready to build a set of labeled images.

All the contents of the bags files will be saved into database ([MongoDB](https://www.mongodb.com)) to keep track of the work done offering the possibility of resuming it in the future.
