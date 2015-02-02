xquery version "1.0-ml";

module namespace ext = "http://marklogic.com/rest-api/resource/search";

declare namespace roxy = "http://marklogic.com/roxy";

(: 
 :The endpoint for the search functionality.. (called in index.html)
 :)

(:
 :)
declare 
%roxy:params("q=xs:string", "lang=xs:string")
function ext:get(
  $context as map:map,
  $params  as map:map
) as document-node()*
{
  map:put($context, "output-types", "application/xml"),
  xdmp:set-response-code(200, "OK"),
  let $query:= map:get($params, "q")
  let $lang:= map:get($params, "lang")
  return
    if ($query!="") then
      (
          let $matched-json:=/json[//pair[@name="title"][cts:contains(., cts:word-query($query, ("stemmed", concat("lang=",$lang))))]]
          return
           document 
          {  
            <ol id="selectable">
              {
              for $matchj in $matched-json
                let $title:=$matchj/pair[@name="title"]/text()
                (:here we need some optimization :)
                let $matchingTitle:=string-join($matchj//pair[@name="title"][cts:contains(., cts:word-query($query, ("stemmed", concat("lang=",$lang))))]/text(), "..")
                order by $title
                return
                  <li title="{$title}" id="{xdmp:node-uri($matchj)}">{$title} <br/><span style="font-size: 10px">... {$matchingTitle} ...</span></li>    
              }
            </ol>
            }
        )
    else(
      (:returning all terms sorted alphabetically:)
      document 
      {  
        <ol id="selectable">
          {
          for $doc in fn:doc()
            let $title:=$doc/json/pair[@name="title"]/text()
            order by $title
            return
              <li title="{$title}" id="{xdmp:node-uri($doc)}">{$title}</li>    
          }
        </ol>
        }
      )
};

(:
 :)
declare 
%roxy:params("")
function ext:put(
    $context as map:map,
    $params  as map:map,
    $input   as document-node()*
) as document-node()?
{
  map:put($context, "output-types", "application/xml"),
  xdmp:set-response-code(200, "OK"),
  document { "PUT called on the ext service extension" }
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
