//Initializing Google search engine
var imageSearch;
google.load('search', '1');
google.setOnLoadCallback(function(){
    imageSearch = new google.search.ImageSearch();
    }
);



eXide.namespace("eXide.app");

/**
 * Static class for the main application. Controls the GUI.
 */
eXide.app = (function() {
	var dbBrowser;
    var projects;
	var preferences;
    var templates = {};
    var menu;
    var lastQuery = null;
	var hitCount = 0;
	var startOffset = 0;
	var currentOffset = 0;
	var endOffset = 0;
	var mapModel=null;
	var login = null;
    //Moje zmienne
    var currentUUID =null;
    var currentIdeaChanged = false;
    // used to detect when window looses focus
    var hasFocus = true;
    
    var resultPanel = "south";

	return {
        
		init: function(afterInitCallback) {
		    //mMup init
		    window.onerror = alert;
		    
        	var container = jQuery('#container'),
        	isTouch = false,
        	renderImages = false;
        	mapModel = new MAPJS.MapModel(MAPJS.KineticMediator.layoutCalculator, ['Imagine something...', 'How does it smell...', 'Tell the story...'], ['hoo har']);
        	container.mapWidget(console,mapModel, isTouch, renderImages);
        	jQuery('body').mapToolbarWidget(mapModel);
        	jQuery('#linkEditWidget').linkEditWidget(mapModel);
        	window.mapModel = mapModel;
        	
        	jQuery('.arrow').click(function () {
        		jQuery(this).toggleClass('active');
        	});
		    //eXide
            menu = new eXide.util.Menubar($(".menu"));
			dbBrowser = new eXide.browse.Browser(document.getElementById("open-dialog"));
			preferences = new eXide.util.Preferences(null);
            eXide.app.initGUI(menu);

            // save restored paths for later
            eXide.app.getLogin(function() {
                eXide.app.initStatus("Restoring state");
                eXide.app.restoreState(function(restored) {
                    //editor.init();
                    if (afterInitCallback) {
                        afterInitCallback(restored);
                    }
                    // dirty workaround to fix editor height
                    var southStatus = localStorage.getItem("eXide.layout.south");
                    $("#layout-container").layout().toggle("south");
                    
                    if (eXide.configuration.allowGuest) {
                        $("#splash").fadeOut(400);
                    } else {
                        eXide.app.requireLogin(function() {
                            $("#splash").fadeOut(400);
                        });
                    }
                });
            });
            
			$(window).resize(eXide.app.resize);
			
			$(window).unload(function () {
				eXide.app.saveState();
			});
            
            eXide.find.Modules.addEventListener("open", null, function (module) {
                eXide.app.findDocument(module.at);
            });

            eXide.app.getMapItems();
            eXide.app.newMapItem();
		},
//Moje funkcje!!!!!!!!!!!!!!!!!!!!!!!!
        newMapItem: function(){
            //setting the uuid flag to null
            currentUUID=null;
            var json;
            $.ajax(
                {
                    url: "rest/new",
                    dataType: 'json',
                    accepts: {
                        text: "application/json"
                    },
                    async: false,
                    success: function(bindings) {
                        json = bindings;
                        idea = MAPJS.content(json);
                        mapModel.setIdea(idea);
                        mapModel.editNode();
                        idea.addEventListener('changed', eXide.app.onIdeaChanged);
                    }
                } 
            );
        },
        openMapItem: function(uuid){
            currentUUID=uuid;
            var json;
            $.ajax(
                {
                    url: "rest/open",
                    dataType: 'json',
                    data: {
                        id: uuid
                    },
                    accepts: {
                        text: "application/json"
                    },
                    async: false,
                    success: function(bindings) {
                         json = bindings;    
                    }
                } 
            );
            idea = MAPJS.content(json);
            mapModel.setIdea(idea);
            idea.addEventListener('changed', eXide.app.onIdeaChanged);
        },
        getMapItems: function() {
            var htm;
            $.ajax(
            {
                url: "rest/search",
                dataType: 'html',
                data: {
                    tableId: "jsonID"
                },
                accepts: {
                    text: "application/xml"
                },
                async: false,
                success: function(bindings) {
                     htm = bindings;    
                }
            });
            $("#itemList").html(htm);
            $("#itemList ol").selectable({
                selected:function(){
                    var selId=$('#selectable .ui-selected').attr('id');
                    if(currentIdeaChanged==true){
                        $("#dialog-confirm-close").dialog({
                            appendTo: "#layout-container",
        					resizable: false,
        					height:140,
        					modal: true,
        					buttons: {
        						"Close": function() {
        					        $( this ).dialog( "close" );
        							currentIdeaChanged = false;
        							eXide.app.openMapItem(selId);
        						},
        						Cancel: function() {
        							$( this ).dialog( "close" );
        						}
        					},
                            open: function() { 
                                $(this).closest('.ui-dialog').find('.ui-dialog-buttonpane button:eq(0)').focus(); 
                                $(this).closest('.ui-dialog').find('.ui-dialog-buttonpane button:eq(1)').blur(); 
                            }
        				});
                    }else{
                        eXide.app.openMapItem(selId);
                    }
                }
            });
        },
        
        saveMapItem: function() {
            eXide.app.requireLogin(function () {
                var saveIdea = mapModel.getIdea()
                $.ajax(
                {
                    url: "rest/save?id=" + currentUUID,
                    type: 'POST',
                    contentType:'application/json',
                    data: JSON.stringify(saveIdea), 
                    dataType:'json',
                    success: function (data) {
						eXide.util.message(data.response + " stored.");
						if(currentUUID==null){
                            eXide.app.getMapItems();
                        }
						currentIdeaChanged = false;
					},
					error: function (data) {
						eXide.util.message("error by storing.");
					}
                });
                
            });
		},
		        
        deleteMapItem: function() {
            eXide.app.requireLogin(function () {
                if (currentUUID!=null) {
                    //trying to find next item if not found select the first one
                    var nextItemId=$('#selectable .ui-selected').next().attr('id');
                    if(nextItemId==null){
                        nextItemId=$('#selectable li').first().attr('id');
                    }
                    
                    $.ajax(
                    {
                        url: "rest/delete",
                        contentType:'application/json',
                        data: {
                            id: currentUUID
                        },
                        dataType:'json',
                        success: function (data) {
    						eXide.util.message(data.response + " deleted.");
    						eXide.app.getMapItems();
    						//opening next available mapItem or the first one (selected above) if available. return new item if list is empty 
    						if(nextItemId!=null){
    						    eXide.app.openMapItem(nextItemId);
    						    $("li[id='"+nextItemId+"']").addClass('ui-selected');
    						}else{
    						    eXide.app.newMapItem;
    						}
    					},
    					error: function (data) {
    						eXide.util.message("error by deleting.");
    					}
                    });
                }
            });
		},
		
		onIdeaChanged: function(){
		    currentIdeaChanged = true;
		},
        hasFocus: function() {
            return hasFocus;
        },
        
        getMenu: function() {
            return menu;
        },
        
		resize: function(resizeIframe) {
			var panel = $("#editor");
			var header = $(".header");
            if (resizeIframe) {
                var resultsContainer = $(".ui-layout-" + resultPanel);
                var resultsBody = $("#results-body");
                $("#results-iframe").width(resultsBody.innerWidth());
                $("#results-iframe").height(resultsContainer.innerHeight() - $(".navbar", resultsContainer).height() - 8);
                $("#results-body").height(resultsContainer.innerHeight() - $(".navbar", resultsContainer).height() - 8);
            }
		},

		setGoogleIcon: function() {
			$("#get-google-icon-dialog").dialog("option", "title", "Select Google picture");
			$("#get-google-icon-dialog").dialog("option", "buttons", { 
				"cancel": function() { $(this).dialog("close"); },
				"Select": function() {
				    var selImg=$('#google-panel .ui-selected img');
				    dataUrl = $(selImg).attr('src');
				    imgWidth=$(selImg).width();
				    imgHeight=selImg.height();
                    var scaleX = Math.min(imgWidth, 300) / imgWidth,
                    scaleY = Math.min(imgHeight, 300) / imgHeight,
                    scale = Math.min(scaleX, scaleY);
                    var position = "left";
                    mapModel.setIcon('drag and drop', dataUrl, Math.round(imgWidth * scale), Math.round(imgHeight * scale), position, ideaId);
                    $(this).dialog("close");
				}
			});
			$("#get-google-icon-dialog").dialog("open");
			var ideaId = mapModel.getSelectedNodeId();
			var idea = mapModel.findIdeaById(ideaId);
			keyword=idea.title;
            imageSearch.setSearchCompleteCallback(this, eXide.app.onGoogleSearchComplete, null);
            imageSearch.execute(keyword);
            $("#searchGoogleStr").val(keyword);
            var button = $("#searchGoogleBtn").button();
	        button.click(
			    function(){
			        var str = $("#searchGoogleStr").val();
			        imageSearch.setSearchCompleteCallback(this, eXide.app.onGoogleSearchComplete, null);
			        imageSearch.execute(str);
			    }    
			);
            
		},

        onGoogleSearchComplete: function() {
            // Check that we got results
            var contentDiv = document.getElementById('google-panel');
            if (imageSearch.results && imageSearch.results.length > 0) {
            // Grab our content div, clear it.
                contentDiv.innerHTML = '';
    
                var results = imageSearch.results;
                for (var i = 0; i < results.length; i++) {
                    // For each result image to the screen
                    var result = results[i];
                    var imgContainer = document.createElement('div');
                    var newImg = document.createElement('img');
                    // There is also a result.url property which has the escaped version
                    newImg.src=result.tbUrl;
                    imgContainer.appendChild(newImg);
                    // Put our title + image in the content
                    contentDiv.appendChild(imgContainer);
                }
                //clear search 
                imageSearch.clearResults();
                $( "#google-panel" ).selectable();
            }else{
                contentDiv.innerHTML = '<p>Nothing found</p>';
            }
        },
		
		manage: function() {
			eXide.app.requireLogin(function() {
                dbBrowser.reload(["reload", "create", "upload", "properties", "open", "cut", "copy", "paste"], "manage");
                $("#open-dialog").dialog("option", "title", "DB Manager");
                $("#open-dialog").dialog("option", "buttons", { 
                    "Close": function() { $(this).dialog("close"); }
                });
                $("#open-dialog").dialog("open");
			});
		},
        
		restoreState: function(callback) {
			if (!eXide.util.supportsHtml5Storage)
				return false;
			preferences.read();
			
            var restoring = {};
            callback(restoring);
            
			return restoring;
		},
        
		saveState: function() {
			if (!eXide.util.supportsHtml5Storage)
				return;
			localStorage.clear();
			preferences.save();
			
            var layout = $('#layout-container').layout();
            localStorage["eXide.layout.south"] = layout.state.south.isClosed ? "closed" : "open";
            localStorage["eXide.layout.west"] = layout.state.west.isClosed ? "closed" : "open";
            localStorage["eXide.layout.east"] = layout.state.east.isClosed ? "closed" : "open";
            localStorage["eXide.layout.resultPanel"] = resultPanel;
		},
		
        getLogin: function(callback) {
            $.ajax({
                url: "login",
                dataType: "json",
                success: function(data) {
                    if (data && data.user) {
                        eXide.app.login = data;
                        $("#user").text("Logged in as " + eXide.app.login.user + ". ");
                        if (callback) callback(eXide.app.login.user);
                    } else {
                        eXide.app.login = null;
                        if (callback) callback(null);
                    }
                },
                error: function (xhr, textStatus) {
                    eXide.app.login = null;
                    $("#user").text("Login");
                    if (callback) callback(null);
                }
            })
        },
        
        enforceLogin: function() {
            eXide.app.requireLogin(function() {
                if (!eXide.app.login || eXide.app.login.user === "guest") {
                    eXide.app.enforceLogin();
                }
            });
        },
        
		$checkLogin: function () {
			if (eXide.app.login)
				return true;
			eXide.util.error("Warning: you are not logged in.");
			return false;
		},
		
        requireLogin: function(callback) {
            if (!eXide.app.login) {
                $("#login-dialog").dialog("option", "close", function () {
                    if (eXide.app.login) {
                        callback();
                    } else {
                        eXide.util.error("Warning: you are not logged in!");
                    }
                });
                $("#login-dialog").dialog("open");
            } else
                callback();
        },
        
        showPreferences: function() {
            preferences.show();
        },
        
        getPreference: function(key) {
            return preferences.get(key);
        },


        updateStatus: function(doc) {
            $("#syntax").val(doc.getSyntax());
            $("#status span").text(eXide.util.normalizePath(doc.getPath()));
            if (!doc.isNew() && (doc.getSyntax() == "xquery" || doc.getSyntax() == "html" || doc.getSyntax() == "xml")) {
                $("#status a").attr("href", doc.getExternalLink());
                $("#status a").css("visibility", "visible");
            } else {
                $("#status a").css("visibility", "hidden");
            }
        },
       
        showResultsPanel: function() {
            $("#layout-container").layout().open(resultPanel);
			//layout.sizePane("south", 300);
			eXide.app.resize(true);
        },
        
        prepareResultsPanel: function(target) {
            var contents = $("#results-body").parent().contents().detach();
            contents.appendTo(".ui-layout-" + target);
        },
        
        switchResultsPanel: function() {
            var target = resultPanel === "south" ? "east" : "south";
            eXide.app.prepareResultsPanel(target);
            $("#layout-container").layout().close(resultPanel);
            resultPanel = target;
            if (resultPanel === "south") {
                $(".layout-switcher").attr("src", "resources/images/layouts_split.png");
            } else {
                $(".layout-switcher").attr("src", "resources/images/layouts_split_vertical.png");
            }
            eXide.app.showResultsPanel();
        },
        
        initStatus: function(msg) {
            $("#splash-status").text(msg);
        },
       
		initGUI: function(menu) {
            var layoutState = {
                south: "closed",
                west: "open",
                east: "closed"
            };
            if (eXide.util.supportsHtml5Storage && localStorage.getItem("eXide.firstTime")) {
                layoutState.west = localStorage.getItem("eXide.layout.west");
                layoutState.east = localStorage.getItem("eXide.layout.east");
                layoutState.south = localStorage.getItem("eXide.layout.south");
                resultPanel = localStorage["eXide.layout.resultPanel"] || "south";
            }
            $.log("resultPanel: %s", resultPanel);
			var layout = $("#layout-container").layout({
				enableCursorHotkey: false,
                spacing_open: 6,
                spacing_closed: 8,
				north__size: 72,
				north__resizable: false,
				north__closable: false,
                north__showOverflowOnHover: true,
                north__spacing_open: 0,
				south__minSize: 200,
                south__size: 300,
				south__initClosed: layoutState.south !== "closed",
                south__contentSelector: "#results-body",
                south__onresize: eXide.app.resize,
                south__onopen: eXide.app.resize,
				west__size: 200,
				west__initClosed: layoutState.west == "closed",
				west__contentSelector: ".content",
                west__onopen: eXide.app.resize,
                east__minSize: 300,
                east__size: 450,
                east__initClosed: layoutState.east == "closed",
                east__onresize: eXide.app.resize,
                east__onopen: eXide.app.resize,
				center__minSize: 300,
			    center__onresize: eXide.app.resize,
				center__contentSelector: ".content"
			});
            eXide.app.prepareResultsPanel(resultPanel);
			$("#open-dialog").dialog({
                appendTo: "#layout-container",
				title: "Open file",
				modal: false,
		        autoOpen: false,
		        height: 480,
		        width: 600,
				open: function() { dbBrowser.init(); },
				resize: function() { dbBrowser.resize(); }
			});
			$("#get-google-icon-dialog").dialog({
                appendTo: "#layout-container",
				title: "Get Picture from Google",
				modal: false,
		        autoOpen: false,
		        height: 480,
		        width: 600,
				open: function() { 
				   
				},
				resize: function() { }
			});
			$("#login-dialog").dialog({
                appendTo: "#layout-container",
				title: "Login",
				modal: true,
				autoOpen: false,
				buttons: {
					"Login": function() {
                        var user = $("#login-form input[name=\"user\"]").val();
                        var password = $("#login-form input[name=\"password\"]").val();
                        var params = {
                            user: user, password: password
                        }
                        if ($("#login-form input[name=\"duration\"]").is(":checked")) {
                            params.duration = "P14D";
                        }
						$.ajax({
							url: "login",
							data: params,
                            dataType: "json",
							success: function (data) {
								eXide.app.login = data;
								$.log("Logged in as %s. Is dba: %s", eXide.app.login.user, eXide.app.login.isAdmin);
								$("#login-dialog").dialog("close");
								$("#user").text("Logged in as " + eXide.app.login.user + ". ");
							},
							error: function (xhr, status, data) {
								$("#login-error").text("Login failed. " + data);
								$("#login-dialog input:first").focus();
							}
						});
					},
					"Cancel": function () { $(this).dialog("close"); editor.focus(); }
				},
				open: function() {
					// clear form fields
					$(this).find("input").val("");
					$(this).find("input:first").focus();
					$("#login-error").empty();
					
					var dialog = $(this);
					dialog.find("input").keyup(function (e) {
						if (e.keyCode == 13) {
				           dialog.parent().find(".ui-dialog-buttonpane button:first").trigger("click");
				        }
					});
				}
			});
			$("#keyboard-help").dialog({
                appendTo: "#layout-container",
				title: "Keyboard Shortcuts",
				modal: false,
				autoOpen: false,
				height: 400,
                width: 350,
				buttons: {
					"Close": function () { $(this).dialog("close"); }
				},
				open: function () {
					eXide.edit.commands.help($("#keyboard-help"), editor);
				}
			});
            $("#about-dialog").dialog({
                appendTo: "#layout-container",
                title: "About",
                modal: false,
                autoOpen: false,
                height: 300,
                width: 450,
                buttons: {
    				"Close": function () { $(this).dialog("close"); }
				}
            });
            
            
            //eXide.util.Popup.init("#autocomplete-box", editor);
            
            $(".toolbar-buttons").buttonset();
            
			// initialize buttons and menu events
            var button = $("#open").button("option", "icons", { primary: "ui-icon-folder-open" });
			button.click(eXide.app.openDocument);
            menu.click("#menu-file-open", eXide.app.openDocument);

			menu.click("#menu-file-close", eXide.app.closeDocument);
			
            button = $("#new").button("option", "icons", { primary: "ui-icon-document" });
			button.click(function() {
                eXide.app.newMapItem();
			});
			menu.click("#menu-file-new", eXide.app.newDocumentFromTemplate);
    		menu.click("#menu-file-new-xquery", function() {
                eXide.app.newDocument(null, "xquery");
    		});
            
            button = $("#save").button("option", "icons", { primary: "ui-icon-disk" });
			button.click(eXide.app.saveMapItem);
			menu.click("#menu-file-save", eXide.app.saveMapItem);
			
			button = $("#deleteItem").button("option", "icons", { primary: "ui-icon-close" });
			button.click(eXide.app.deleteMapItem);

			button = $("#setGoogleIcon").button("option", "icons", { primary: "ui-icon-close" });
			button.click(eXide.app.setGoogleIcon);

            menu.click("#menu-file-save-as", eXide.app.saveDocumentAs);
			
            menu.click("#menu-file-reload", eXide.app.reloadDocument);
            
			menu.click("#menu-file-download", eXide.app.download);
			menu.click("#menu-file-manager", eXide.app.manage);
			// menu-only events
            
			menu.click("#menu-edit-undo", function () {
				editor.editor.undo();
			});
			menu.click("#menu-edit-redo", function () {
				editor.editor.redo();
			});
            menu.click("#menu-edit-find", function() {
                var config = require("ace/config");
                config.loadModule("ace/ext/searchbox", function(e) {e.Search(editor.editor)});
            });
            menu.click("#menu-edit-toggle-comment", function () {
                editor.editor.toggleCommentLines();
            });
			menu.click("#menu-edit-preferences", function() {
                preferences.show(); 		
			});
            menu.click("#menu-navigate-definition", function () {
                editor.exec("gotoDefinition");
            });
            menu.click("#menu-navigate-modules", function () {
                var doc = editor.getActiveDocument();
	    		eXide.find.Modules.select(doc.syntax);
            });
            menu.click("#menu-navigate-info", function() {
                editor.exec("showFunctionDoc");
            });
            menu.click("#menu-navigate-symbol", function() {
                editor.exec("gotoSymbol");
            });
            menu.click("#menu-navigate-buffer", function() {
                editor.selectTab();
            });
            menu.click("#menu-navigate-commands", function() {
                eXide.app.getMenu().commandPalette();
            });
			menu.click("#menu-deploy-run", eXide.app.openApp);
			
            menu.click("#menu-help-keyboard", function (ev) {
				$("#keyboard-help").dialog("open");
			});
            menu.click("#menu-help-about", function (ev) {
				$("#about-dialog").dialog("open");
			});
            // menu.click("#menu-help-documentation", function(ev) {
            //     eXide.util.Help.show();
            // });
            menu.click("#menu-help-documentation", function(ev) {
                window.open("docs/doc.html");
            });
			// syntax drop down
			$("#syntax").change(function () {
				editor.setMode($(this).val());
			});

			$("#user").click(function (ev) {
				ev.preventDefault();
				if (eXide.app.login) {
					// logout
					$.get("login?logout=logout");
					$("#user").text("Login");
					eXide.app.login = null;
				} else {
					$("#login-dialog").dialog("open");
				}
			});
            if (!eXide.util.supportsFullScreen()) {
                $("#toggle-fullscreen").hide();
            }
            $("#toggle-fullscreen").click(function(ev) {
                ev.preventDefault();
                eXide.util.requestFullScreen(document.getElementById("fullscreen"));
            });
            $(".results-container .layout-switcher").click(eXide.app.switchResultsPanel);
			$('.results-container .next').click(eXide.app.browseNext);
			$('.results-container .previous').click(eXide.app.browsePrevious);
            $("#serialization-mode").change(function(ev) {
                if (lastQuery) {
                    eXide.app.runQuery(lastQuery);
                }
            });
            $("#error-status").mouseover(function(ev) {
                var error = this;
                $("#ext-status-bar").each(function() {
                    this.innerHTML = error.innerHTML;
                    $(this).css("display", "block");
                });
            });
            $("#ext-status-bar").mouseout(function(ev) {
               $(this).css("display", "none");
            });
            $(window).blur(function() {
                hasFocus = false;
            });
            $(window).focus(function() {
                var checkLogin = !hasFocus;
                hasFocus = true;
                if (checkLogin) {
                   eXide.app.getLogin();
                } 
            });
            
            // first time startup dialog
            $("#dialog-startup").dialog({
                appendTo: "#layout-container",
        		modal: false,
                title: "Quick Start",
    			autoOpen: false,
                width: 400,
                height: 300,
    			buttons: {
                    "OK" : function() { $(this).dialog("close"); }
    			}
    		});
            if (!eXide.util.supportsHtml5Storage)
    		    return;
            // if local storage contains eXide properties, the app has already
            // been started before and we do not show the welcome dialog
            var showHints = localStorage.getItem("eXide.firstTime");
            if (!showHints || showHints == 1) {
                $("#dialog-startup").dialog("open");
            }
		}
	};
}());