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
  the endpoint returns the next Flashcard to learn. TODO: write the alghorithm to select one like in anymemo.org
  CREATE TABLE `learning_data` (`acqReps` INTEGER , `acqRepsSinceLapse` INTEGER , `easiness` FLOAT DEFAULT 2.5 , `grade` INTEGER , 
  `id` INTEGER PRIMARY KEY AUTOINCREMENT , `lapses` INTEGER , `lastLearnDate` VARCHAR DEFAULT '2010-01-01 00:00:00.000000' , 
  `nextLearnDate` VARCHAR DEFAULT '2010-01-01 00:00:00.000000' , `retReps` INTEGER , `retRepsSinceLapse` INTEGER , `updateDate` VARCHAR )
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
    let $commitedFlashcards := /flashcard[learning-data]
    let $cardsToRepeat := 
      for $card in $commitedFlashcards
        let $next-repeat :=xs:dateTime($card/learning-data/date-next-repeat/text())
        order by $next-repeat
        return
          $card
    let $nextFlashcard :=$cardsToRepeat[1]
    let $uuid := xdmp:node-uri($nextFlashcard)
    return
      document { '{"uuid": "'||$uuid||'", "content" : '||xqjson:serialize-json($nextFlashcard/json)||'}' }
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
    let $grade := map:get($params, "grade")
    let $doc := document($uri)
    let $learn-node:= $doc/flashcard/learning-data
    return
      if($learn-node/*) then
        ext:grade($uri, $grade, $learn-node)
      else
        ext:commit($uri, $learn-node)
  }
  catch ($exception) {
    document {'{"response" : "Problem commiting the item '|| $exception ||'}' }
  }
};
(:naive implementation of grading function

 CREATE TABLE `learning_data` (`acqReps` INTEGER , `acqRepsSinceLapse` INTEGER , `easiness` FLOAT DEFAULT 2.5 , `grade` INTEGER , 
  `id` INTEGER PRIMARY KEY AUTOINCREMENT , `lapses` INTEGER , `lastLearnDate` VARCHAR DEFAULT '2010-01-01 00:00:00.000000' , 
  `nextLearnDate` VARCHAR DEFAULT '2010-01-01 00:00:00.000000' , `retReps` INTEGER , `retRepsSinceLapse` INTEGER , `updateDate` VARCHAR )
    <learn-history/>,
        <easiness/>,
        <grade></grade>,,
             
        <date-next-repeat>{fn:current-dateTime() + xs:dayTimeDuration("PT24H")}</date-next-repeat>
  :)
declare function ext:grade($uri, $grade, $learn-node){
  let $learn-history:=$learn-node/learn-history/repeat
  let $last-lapse:= $learn-history[@grade=0][last()]
  let $easiness := 2
  let $date-next-repeat := fn:current-dateTime() + xs:dayTimeDuration("PT24H")
  let $current-learn-data :=
      element learning-data {
        $learn-node/date-commited,
        element learn-history{
          $learn-node/learn-history/*, element repeat{ attribute date{fn:current-dateTime()}, attribute grade{$grade}}
        },
        element date-next-repeat {$date-next-repeat},
        element last-lapse {$last-lapse}
      }
  return
  (
    xdmp:node-replace($learn-node, $current-learn-data),
    document { '{"response" : "item: grade '||$grade||'"}' }
  )
};


declare function ext:commit($uri, $learn-node){
  let $init-learn-data :=
      <learning-data>
        <date-commited>{fn:current-dateTime()}</date-commited>
        <easiness>2.5</easiness>
        <date-next-repeat>{fn:current-dateTime() + xs:dayTimeDuration("PT24H")}</date-next-repeat>
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
  try{
    let $i := $input
    let $uri := map:get($params, "uri")
    let $doc := document($uri)
    let $learn-node:= $doc/flashcard/learning-data
    let $init-learn-data :=
      <learning-data>
        <date-commited>{fn:current-dateTime()}</date-commited>
      </learning-data>
    return
    (
      xdmp:node-replace($learn-node, $init-learn-data),
      document { '{"response" : "item added to the learning process"}' }
    )
  }
  catch ($exception) {
    document {'{"response" : "Problem commiting the item '|| $exception ||'}' }
  }
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
