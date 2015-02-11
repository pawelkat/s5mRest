xquery version "1.0-ml";

module namespace ext = "http://marklogic.com/rest-api/resource/learn";

declare namespace roxy = "http://marklogic.com/roxy";
import module namespace xqjson = "http://xqilla.sourceforge.net/lib/xqjson" at "/modules/xqjson.xqy";
(: 
 : To add parameters to the functions, specify them in the params annotations. 
 : Example
 :   declare %roxy:params("uri=xs:string", "priority=xs:int") ext:get(...)
 : This means that the get function will take two parameters, a string and an int.
 :)

(:
  the endpoint returns the next Flashcard to learn. TODO: write the alghorithm to select one like in anymemo.org or mnemosyne.org
:)
declare 
%roxy:params("uri=xs:string")
function ext:get(
  $context as map:map,
  $params  as map:map
) as document-node()*
{
  map:put($context, "output-types", "application/json"),
  xdmp:set-response-code(200, "OK"),
  try{
    let $commitedFlashcards := /flashcard[learning-data/date-commited]
    let $cardsToRepeat := 
      for $card in $commitedFlashcards
        let $next-repeat :=xs:dateTime($card/learning-data/date-next-repeat/text())
        where $next-repeat < fn:current-dateTime() 
        order by $next-repeat
        return
          $card
    let $nextFlashcard :=$cardsToRepeat[1]
    let $uuid := if($nextFlashcard) then xdmp:node-uri($nextFlashcard) else "null"
    let $itemJson:=
      if($nextFlashcard) then
        xqjson:serialize-json($nextFlashcard/json)
      else
        '{"title":"Well done!!","id":1}'
    return
      document { '{"uuid": "'||$uuid||'", "countCardsToRepeat" : '||count($cardsToRepeat)||', "content" : '||$itemJson||'}' }
   }
  catch ($exception) {
    document {'{"response" : "Problem commiting the item '|| $exception ||'}' }
  }
};

(:
  here the endpoint will add the 'flashcard to the learning process'POST DIDN'T WORK!
 :)
declare 
%roxy:params("uri=xs:string")
function ext:put(
    $context as map:map,
    $params  as map:map,
    $input   as document-node()*
) as document-node()?
{
  map:put($context, "output-types", "application/json"),
  xdmp:set-response-code(200, "OK"),
  try{
    let $uri := map:get($params, "uri")
    let $grade := xs:integer(map:get($params, "grade"))
    let $doc := document($uri)
    let $learn-node:= $doc/flashcard/learning-data
    return
      if($learn-node/*) then
        ext:grade($uri, $grade, $learn-node)
      else
        ext:commit($uri, $learn-node)
  }
  catch ($exception) {
    document {'{"response" : "Problem with the item '|| $exception ||'}' }
  }
};
(:naive implementation of grading function
  in Anymemo we have this table:
 CREATE TABLE `learning_data` (`acqReps` INTEGER , `acqRepsSinceLapse` INTEGER , `easiness` FLOAT DEFAULT 2.5 , `grade` INTEGER , 
  `id` INTEGER PRIMARY KEY AUTOINCREMENT , `lapses` INTEGER , `lastLearnDate` VARCHAR DEFAULT '2010-01-01 00:00:00.000000' , 
  `nextLearnDate` VARCHAR DEFAULT '2010-01-01 00:00:00.000000' , `retReps` INTEGER , `retRepsSinceLapse` INTEGER , `updateDate` VARCHAR )
  :)
declare function ext:grade($uri, $grade as xs:integer, $learn-node){
  let $learn-history:=$learn-node/learn-history/repeat
  let $new-interval:= ext:get-new-interval($learn-node, $grade)
  (:TODO: here we should make it more clever, using Mnemosyne algorithm, we use minute interval for PRESENTATION PURPOSES :)
  (:let $date-next-repeat := fn:current-dateTime() + xs:dayTimeDuration('P'||$grade||'D'):)
  let $date-next-repeat := fn:current-dateTime() + xs:dayTimeDuration('PT'||$grade||'M')
  let $current-learn-data :=
      element learning-data {
        $learn-node/date-commited,
        element learn-history{
          $learn-node/learn-history/*, 
          element repeat{ attribute date{fn:current-dateTime()}, attribute grade{$grade}}
        },
        element date-next-repeat {$date-next-repeat}
      }
  return
  (
    xdmp:node-replace($learn-node, $current-learn-data),
    document { '{"response" : "Item will be repeated '||$date-next-repeat||'"}' }
  )
};

(:we use minute interval for PRESENTATION PURPOSES, Change it to PT1D :)
declare function ext:commit($uri, $learn-node){
  let $init-learn-data :=
      <learning-data>
        <date-commited>{fn:current-dateTime()}</date-commited>
        <easiness>2.5</easiness>
        <date-next-repeat>{fn:current-dateTime() + xs:dayTimeDuration("PT1M")}</date-next-repeat>
      </learning-data>
  return
  (
    xdmp:node-replace($learn-node, $init-learn-data),
    document { '{"response" : "item added to the learning process"}' }
  )
};
(:
  here the endpoint will add the 'flashcard to the learning process'
 :)
declare 
%roxy:params("uri=xs:string")
function ext:post(
    $context as map:map,
    $params  as map:map,
    $input   as document-node()*
) as document-node()*
{
  map:put($context, "output-types", "application/json"),
  xdmp:set-response-code(200, "OK"),
  document { "POST called on the ext service extension" }
};

(:
 :)
declare 
%roxy:params("")
function ext:delete(
    $context as map:map,
    $params  as map:map
) as document-node()?
{
  map:put($context, "output-types", "application/xml"),
  xdmp:set-response-code(200, "OK"),
  document { "DELETE called on the ext service extension" }
};
(: The function returns the bacis repetition interval. It is partially correct, wee need to change at the bottom:)
declare function ext:get-new-interval($learn-node, $grade as xs:integer){
  let $learn-history:=$learn-node/learn-history/repeat
  let $last-grade:= xs:integer($learn-history[last()]/@grade)
  let $last-lapse:= $learn-history[@grade=0][last()]
  let $last-lapse-position:= $last-lapse/count(preceding-sibling::*) + 1
  let $retention-reps-since-lapse:=$learn-history[position()>$last-lapse-position]
  return
    if ($last-grade = (0,1) and $grade = (0,1)) then 0
    else 
    if ($last-grade = (0,1) and $grade = (2,3,4,5)) then 1
    else 
    if ($last-grade = (2,3,4,5) and $grade = (0,1)) then 1
    else 
    if ($last-grade = (2,3,4,5) and $grade = (2,3,4,5)) then ((count($retention-reps-since-lapse) + 1) * $grade)
    else 0

};