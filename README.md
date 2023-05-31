# Web tool for Labeling

Semplice web app che permette di labellare un set di immagini estratte da un file bag.

Una volta avviato il server, l'app presenta la pagina home in cui si ha la possibilità o di caricare un file bag, e quindi di estrarre il suo contenuto e creare un'instanza locale, oppure di selezionare una delle istanze locali già presenti per accedere all'area di annotazione.

![homepage](https://github.com/AlessandroMangili/WebToolLabelImage/assets/86318455/a5d12ba4-f62c-40b6-9db6-95560274947f)

Una volta selezionata l'istanza locale, si verrà ridirezionati all'interno della pagina di annotazione in cui al centro si trova un riquadro contenente le immagini del topic selezionato e ai lati, sinistro e destro, due colonne che servono per creare rispettivamente classi e sottoclassi. \
In alto del riquadro possiamo trovare due funzionalità: una selezione per cambiare il topic, e una checkbox che servirà per mantenere i bounding box così da non doverli ricrearli per ogni immagine.

![label](https://github.com/AlessandroMangili/WebToolLabelImage/assets/86318455/5434998b-f6a5-4221-affa-4dab316f9066)

Come intestazione della colonna di sisnitra troviamo un pulsante che ci permette di creare una classe per i bounding box con il rispettivo colore, mentre nella colonna di destra, è presente una checkbox da spuntare ogni qualvolta si ha la necessità di dover creare delle sottoclassi per migliorare la granularità dell'annotazione.

Prima di poter disegnare un buonding box è necessario creare una o più classi per poi selezionarle. \
Tramite la combinazione di tasti `ctrl + click mouse` e trascinando il mouse sarà possibile creare i bounding box, invece per passare all'immagine successiva o precedente è sufficiente premere rispettivamente i tasti `.` e `,`.

Sui bounding box è possibile compiere le operazioni di traslazione e ridimensionamento; inoltre è possibile selezionandoli, rimuoverli premendo il tasto `canc`. Per rimuovere tutti i bounding box di una classe/sottoclasse, è sufficiente fare doppio click su di essa in modo tale cancellare tutti i bounding box relativi a quella classe/sottoclasse.

Si può sempre interrompere il lavoro per poi riprendere in un secondo momento in quanto i dati delle classi, sottoclassi e bounding box sono salvati nell'istanza locale di MongoDB, all'interno del database `roslog`.

Una volta finito di labellare l'intero set di immagini, è possibile esportarlo dell'istanza locale di MongoDB.

## Installazione

Innanzitutto bisogna avere già installato docker sulla propria macchina per poter creare l'immagine ed eseguire il container dell'applicazione; in caso questo non sia ancora stato fatto, è possibile fare riferimento alla pagina relativa all'installazione [Docker](https://docs.docker.com/engine/install/). 

Dopo aver installato docker sulla propria macchina, clonare la repository; una volta finito di clonare la repository e posizionato all'interno del progetto, siamo pronti a creare l'immagine usando il comando `docker build -t app .`

Una volta finita la creazione dell'immagine, usiamo il comando `docker run -i -t -p 8000:8000 app bash` per avviare il container; appena questo è stato avviato, usare il comando `node src/server.js` per fare partire il server e poter iniziare a usare l'applicazione.

## Consigli

Ogni volta che si riavvia il sistema, bisogna fermare il processo MongoDB con `sudo systemctl stop mongodb`.

---

## English
