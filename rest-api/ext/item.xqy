xquery version "1.0-ml";

module namespace ext = "http://marklogic.com/rest-api/resource/item";
declare namespace roxy = "http://marklogic.com/roxy";
import module namespace xqjson = "http://xqilla.sourceforge.net/lib/xqjson" at "/MarkLogic/xqjson.xqy";
(: 
 : To add parameters to the functions, specify them in the params annotations. 
 : Example
 :   declare %roxy:params("uri=xs:string", "priority=xs:int") ext:get(...)
 : This means that the get function will take two parameters, a string and an int.
 :)

(:import module namespace impl = "http://marklogic.com/appservices/search-impl" at "/MarkLogic/appservices/search/search-impl.xqy";
import module namespace search="http://marklogic.com/appservices/search" at "/MarkLogic/appservices/search/search.xqy";
declare option xdmp:mapping "false";
declare variable $SEARCH-OPTIONS :=
  <options xmlns="http://marklogic.com/appservices/search">
    <search-option>unfiltered</search-option>
    <term>
      <term-option>case-insensitive</term-option>
    </term>
    <constraint name="facet1">
      <collection>
        <facet-option>limit=10</facet-option>
      </collection>
    </constraint>

    <return-results>true</return-results>
    <return-query>true</return-query>
  </options>;
search:search("boasting", $SEARCH-OPTIONS, 1, 10)
?:)
(:
simple search query:
/json[//pair[@name="title"][cts:contains(., cts:word-query("angeben", ("stemmed", "lang=en")))]]
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
    document { xqjson:serialize-json($doc/*) }
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
  map:put($context, "output-types", "application/xml"),
  xdmp:set-response-code(200, "OK"),

  try{
    let $uri := map:get($params, "uri")
    let $doc := document($uri)
    let $contentXml := xqjson:parse-json($input)
    let $item-title := $contentXml/pair[@name="title"]/text()
    
    return
      if ($doc) then
      (
        let $saved := xdmp:node-replace($doc/*, $contentXml)
        return
          (
          xdmp:set-response-code(404, "Not found"),
          document { "item '"||$item-title||"' saved" }
          )
      )
      else
      (
        document {"Document not found!"}
      )
  }
  catch ($exception) {
      document {"Problem saving the item "|| $exception }
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
  map:put($context, "output-types", "application/xml"),
  xdmp:set-response-code(200, "OK"),

  try{
    let $contentXml := xqjson:parse-json($input)
    let $item-title := $contentXml/pair[@name="title"]/text()
    let $doc-name := ext:generate-uuid-v4()
    return
        if ($item-title!="") then
          (
            let $saved:= xdmp:document-insert("/"||$doc-name||".xml",$contentXml)
            return          
              document { $doc-name }
          )
        else
          (
            document { "item has not any title" }
          )
  }
  catch ($exception) {
      document {"Problem creating the item "|| $exception }
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
  try{
    let $uri := map:get($params, "uri")
    let $doc := document($uri)
    let $item-title := $doc/json/pair[@name="title"]/text()
    let $deleted := xdmp:document-delete($uri)
    return
      document { "item '"||$uri||"' deleted" }
  }
  catch ($exception) {
      document {"Problem deleting the item "|| $exception }
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