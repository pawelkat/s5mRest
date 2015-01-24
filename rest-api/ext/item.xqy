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

(:
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
    let $saved := xdmp:node-replace($doc/*, $contentXml)
    return
      document { "item '"||$item-title||"' saved" }
  }
  catch ($exception) {
      "Problem saving the item ",
      $exception 
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
