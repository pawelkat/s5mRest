xquery version "1.0-ml";

module namespace ext = "http://marklogic.com/rest-api/resource/item";
declare namespace roxy = "http://marklogic.com/roxy";
import module namespace xqjson = "http://xqilla.sourceforge.net/lib/xqjson" at "/modules/xqjson.xqy";
(: 
 : The endpoint for CRUD of Flashcards (index.html)
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
  let $uri := map:get($params, "uri")
  let $doc := document($uri)
  return
    document { xqjson:serialize-json($doc/flashcard/json) }
};

(:
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
    let $doc := document($uri)
    let $contentXml := xqjson:parse-json($input)
    let $item-title := $contentXml/pair[@name="title"]/text()
    
    return
      if ($doc) then
      (
        let $saved := xdmp:node-replace($doc/flashcard/json, $contentXml)
        return
          (         
          document { '{"response" : "item '||$item-title||' saved"}' }
          )
      )
      else
      (
        xdmp:set-response-code(404, "Not found"),
        document {'{"response" : "Document not found!"}'}
      )
  }
  catch ($exception) {
      document {'{"response" : "Problem saving the item '|| $exception ||'}' }
  }
};

(:
 :)
declare 
%roxy:params("")
function ext:post(
    $context as map:map,
    $params  as map:map,
    $input   as document-node()*
) as document-node()*
{
  map:put($context, "output-types", "application/json"),
  xdmp:set-response-code(200, "OK"),

  try{
    let $contentXml := xqjson:parse-json($input)
    (:TODO: externalize xml lang:)
    let $flashcardXml :=<flashcard xml:lang="de"><learning-data/>{$contentXml}</flashcard>
    let $item-title := $contentXml/pair[@name="title"]/text()
    let $doc-name := ext:generate-uuid-v4()
    return
        if ($item-title!="") then
          (
            let $saved:= xdmp:document-insert("/"||$doc-name||".xml",$flashcardXml)
            return          
              document { '{"response" : "Document '||$doc-name||' created"}' }
          )
        else
          (
            document { '{"response" : "item has not any title"}' }
          )
  }
  catch ($exception) {
      document {'{"response" : "Problem creating the item '|| $exception ||'}' }
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
  map:put($context, "output-types", "application/json"),
  xdmp:set-response-code(200, "OK"),
  try{
    let $uri := map:get($params, "uri")
    let $doc := document($uri)
    let $item-title := $doc/json/pair[@name="title"]/text()
    let $deleted := xdmp:document-delete($uri)
    return
      document {'{"response" : "item '||$uri||' deleted"}' }
  }
  catch ($exception) {
      document {'{"response" :"Problem deleting the item '||$exception||'}' }
  }
};

(: HELPER FUNCTIONS :)
declare function ext:random-hex($length as xs:integer) as xs:string {
  string-join(
    for $n in 1 to $length
      return xdmp:integer-to-hex(xdmp:random(15)), ""
  )
};

declare function ext:generate-uuid-v4() as xs:string {
  string-join(
    (
        ext:random-hex(8),
        ext:random-hex(4),
        ext:random-hex(4),
        ext:random-hex(4),
        ext:random-hex(12)
    ),
    "-"
  )
};