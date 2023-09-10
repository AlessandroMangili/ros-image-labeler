# Web tool for Labeling

Semplice web app che permette di labellare ed esportare un set di immagini estratte da un file bag.

## Indice

- [Prerequisiti](#prerequisiti)
- [Per iniziare](#per-iniziare)
- [Installazione e avvio del server](#installazione-e-avvio-del-server)
- [Caricare ed estrarre un file bag](#caricare-ed-estrarre-un-file-bag)
- [Classe e sottoclasse](#classe-e-sottoclasse)
- [Bounding box](#bounding-box)
- [Navigazione nel dataset](#navigazione-nel-dataset)
- [Esportazione](#esportazione)

## Prerequisiti

- [Docker](https://docs.docker.com/engine/install/)

## Per iniziare

Per iniziare ad utilizzare l'applicazione, devi prima di tutto scaricare l'ultima versione oppure clonare la repository tramite comando

```bash
git clone https://github.com/aislabunimi/tesi.triennale.mangili
```

## Installazione e avvio del server

Una volta scaricata/clonata la repository, posizionarsi nella __root__ della cartella e utilizzare il comando

```bash
docker build -t app .
```

per costruire l'immagine del progetto tramite i comandi presenti all'interno del Dockerfile.

Una volta terminata la creazione dell'immagine, dobbiamo avviare il container sulla porta `8000` tramite comando

```bash
docker run -i -t -p 8000:8000 app bash
```

A questo punto, sarà sufficiente usare il comando 
```bash
node src/server.js
```

per avviare il server e poter iniziare a usare l'applicazione.

## Caricare ed estrarre un file bag

Per caricare un file bag all'interno del container docker, usare il seguente comando 

```bash
docker cp ./bag_file CONTAINER_ID:/app/src/bag_file
```

dove:
- `./bag_file` indica il percorso del file che si vuole caricare
- `CONTAINER_ID` indica l'id del container in esecuzione, visibile tramite comando

```bash
docker ps
```

![containerID](https://github.com/AlessandroMangili/RosImageLabeling/assets/86318455/2ec55493-3fe9-40e8-8793-47da4adba6c1)

Il processo di estrazione dei topics potrebbe richiedere anche svariati minuti, a seconda delle dimensioni del file, e una volta completato si verrà reindirizzati alla pagina di labeling.

Una volta effettuato il processo di estrazione, non sarà più necessario eseguirlo per quel file bag siccome basterà caricare l'istanze già salvata selezionandola nella scelta di destra.

![home](https://github.com/aislabunimi/tesi.triennale.mangili/assets/86318455/0221e234-2c7e-472e-b814-27421ffa14a8)

## Iniziare a labellare

### Classe e sottoclasse

Per poter iniziare a labellare un'immagine, bisogna prima creare una classe attraverso il pulsante in alto presente nella colonna di sinistra. La classe da creare non potrà contenere né un nome già in uso, né il colore. Se si intendesse aumentare la granularità dell'annotazione, è possibile aggiungere una sottoclasse tramite il pulsante in alto presente nella colonna di destra. Anche in questo caso il nome della sottoclasse non potrà essere uguale a quello di un'altra sottoclasse presente all'interno della suddetta classe.

Per eliminare una classe o sottoclasse è sufficiente fare doppio click sulla classe/sottoclasse in questione, eliminando di conseguenza tutti i relativi bounding box.

### Bounding box

Per iniziare ad annotare i vari oggetti, bisogna selezionare la classe di riferimento e tramite la combinazione di tasti `ctrl + click mouse` sarà possibile iniziare a tracciare il rettangolo che permetterà di delimitare l'oggetto in questione tramite lo spostamento del mouse. \
Una volta creato, saranno possibili le operazioni di ridimensionamento, spostamento e rimozione (tramite selezione e tasto `canc` per quest'ultima), prestando però attenzione al fatto il bounding box non potrà essere né creato, né spostato e né ridimensionato al di fuori dello spazio di lavoro.

> le scritte all'interno del bounding box non sono targettabili, quindi se questo avrà dimensioni molto ridotte per spostarlo bisognerà selezionare i lati.

Per poter copiare i bounding box da un'immagine alla successiva, è possibile riporre la spunta sulla casella `keep bounding box`. Prestare attenzione al fatto che tenendo premuto o schiacciando ripetutamente in modo troppo velocemente il tasto per passare all'immagine successiva potrebbe causare la mancata copia dei bounding box per quell'immagine.

### Navigazione nel dataset

Ogni volta che viene cambiato il topic di lavoro, verrà caricata l'ultima immagine visitata per quel topic.

Per potersi spostare all'immagine successiva o precedente, vengono utilizzati rispettivamente i tasti `.` e `,` mentre per velocizzare il processo è possibile servirsi dei due bottoni `reset to first image` per ritornare alla prima immagine e `reload from last image` per ritornare all'ultima visitata.

Ulteriore funzione che permette di selezionare un gruppo di immagini sono la scelta degli __fps__ posti in basso a sinistra, i quali ovviamente non possono essere $\leq 0$.

### Esportazione

Attraverso il pulsante posto in basso sarà possibile esportare all'interno della cartella `src/export/nome_dataset/` tutte le collections inerenti a: immagini, classi/sottoclassi e posizioni dei bounding box per ogni immagine divise per topic. Tutti questi file sono esportati in formato `.json` e la struttura di ognuno di essi è consultabile dagli __schema__ presenti all'interno della cartella `src/models/`.

![label](https://github.com/aislabunimi/tesi.triennale.mangili/assets/86318455/4a3dad15-a300-4242-8f7b-c98381d8109a)