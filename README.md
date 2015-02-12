# s5m
## New Generation Flashcards. 

The web-app aims to combine the traditional way of learning using popular Spaced Repetition Software with another fast-learning method that uses associations of texts and images in form similar to mindmaps.
Traditional flashcards even with help of advanced algorithms uses only textual information and human reason doesn't memorize it efficiently. Using the mindmap that associates the given term with related images and other words/terms is more natural for our brains.

![screenshot](screenshot1.png)
### Features
- Flashcard management in the Marklogic database (CRUD).
- Flashcard editor with mindmup canvas (https://github.com/mindmup/mapjs).
- Fulltext search within the whole database.
- Relevant image selector with 'google image search'. Simply write your term and the relevant images will be found. Select the one that is most attracting attention (funny, unusual, ridiculous), that will help to better associate it with the given term.
- Learn mode with Spaced Repetition Algorithm for calculating the card repetition date (basing on the statistics of 'grades') - how good the card was memorized.

### Technologies:
Marklogic 7.0 with REST API (roxy), Bootstrap, JQuery. JQueryUI, MindMup

### Installation:
with roxy:
- ml local bootstrap
- ml local deploy modules
- ml local deploy content

### TODO:
-  Tune the advanced adaptive scheduling algorithm based on modified Mnemosyne algorithm. http://www.supermemo.com/english/algsm11.htm http://www.supermemo.com/help/smalg.htm http://mnemosyne-proj.org/help/getting-started.php. http://nihongoperapera.com/spacing-algorithm-reviews.html. https://github.com/dae/anki  https://github.com/stephenbez/memizr/blob/master/spacedRepetition/flashcards/models.py https://stevebezek.wordpress.com/2011/01/30/announcing-memizr/
- Flashcard statistics (learn.html)
- (optional) textual analysis of topically similar cards (tf-idf), in order to propose the card that could be the continuation of the started topic (in drill mode) to have even more associations!
- Backup/restore/import (from Anymemo)
- Flashcards categorisation
- Language selector (for the stemmed search) 

### Issues:
- no more cards to learn causes an error (solved). 
