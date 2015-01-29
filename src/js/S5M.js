//Initializing Google search engine
var imageSearch;
google.load('search', '1');
google.setOnLoadCallback(function(){
    imageSearch = new google.search.ImageSearch();
    }
);
var currentIdeaChanged = false;
var stack_bottomright = {"dir1": "up", "dir2": "left", "firstpos1": 15, "firstpos2": 15};

$(document).ready(function() {
	//$.pnotify.defaults.history = false;
	//$.pnotify.defaults.styling = "jqueryui";
	jQuery.fn.attachmentEditorWidget = function (mapModel) {
		'use strict';
		return this.each(function () {
			var element = jQuery(this);
			mapModel.addEventListener('attachmentOpened', function (nodeId, attachment) {
				mapModel.setAttachment(
					'attachmentEditorWidget',
					nodeId, {
						contentType: 'text/html',
						content: prompt('attachment', attachment && attachment.content)
					}
				);
			});
		});
	};
	(function () {
		window.onerror = alert;
		
		var container = jQuery('#container'),
		isTouch = false,
		renderImages = false,
		mapModel = new MAPJS.MapModel(MAPJS.KineticMediator.layoutCalculator, ['A brilliant idea...', 'A cunning plan...', 'We\'ll be famous...'], ['hoo har']);
		container.mapWidget(console,mapModel, isTouch, renderImages);
		jQuery('body').mapToolbarWidget(mapModel);
		jQuery('body').attachmentEditorWidget(mapModel);
		$("[data-mm-action='export-image']").click(function () {
			MAPJS.pngExport(idea).then(function (url) {
				window.open(url, '_blank');
			});
		});
		
		//initialize buttons
		var button = $("#new").button();
		button.click(app.newMapItem);
		
		button = $("#save").button();
		button.click(app.saveMapItem);
		
		button = $("#deleteItem").button();
		button.click(app.deleteMapItem); 
		
		button = $("#searchBtn").button();
		button.click(
			function(){
				app.search($("#searchBox").val());
			}
		); 
		button = $("#setGoogleIcon").button();
			button.click(app.setGoogleIcon);
		//
		$("#searchBox").keyup(function(e){
			if(e.keyCode == 13)
			{
				app.search($(this).val());
			}
		});
		jQuery('#linkEditWidget').linkEditWidget(mapModel);
		window.mapModel = mapModel;
		jQuery('.arrow').click(function () {
			jQuery(this).toggleClass('active');
		});
		$(".toolbar-buttons").buttonset();
		app.getMapItems();
		var firstItemId=$('#selectable li').first().attr('id');
		app.openMapItem(firstItemId);
	}());

});

app={
   newMapItem: function(){
		//setting the uuid flag to null
		currentUUID=null;
		var jsonPrototype={"title":"New Item","id":1,"formatVersion":2,"ideas":{"1":{"title":"New Item Explanation","id":2}}}
		idea = MAPJS.content(jsonPrototype);
		mapModel.setIdea(idea);
		mapModel.editNode();
		idea.addEventListener('changed', app.onIdeaChanged);
	},
	openMapItem: function(uuid){
		currentUUID=uuid;
		var json;
		$.ajax(
			{
				url: "v1/resources/item",
				dataType: 'json',
				data: {
					'rs:uri': uuid
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
		//idea.addEventListener('changed', app.onIdeaChanged);
	},
	getMapItems: function() {
		var htm;
		$.ajax(
		{
			url: "v1/resources/search",
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
								app.openMapItem(selId);
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
					app.openMapItem(selId);
				}
			}
		});
	},
	
	saveMapItem: function() {		
		var saveIdea = mapModel.getIdea()
		if (currentUUID==null){
			$.ajax(
				{
					url: "v1/resources/item",
					dataType: 'json',
					type: 'POST',
					contentType:'application/json',
					data: JSON.stringify(saveIdea), 
					dataType:'json',
					success: function (data) {
						app.message(data.responseText + " created");
						app.getMapItems();
						currentUUID = data.responseText;
						currentIdeaChanged = false;
					},
					error: function (data) {
						//change when correct json returned!!
						app.message(data.responseText + " created");
						app.getMapItems();
						currentUUID = data.responseText;
						currentIdeaChanged = false;
					}
				} 
			);
		}
		else{
			$.ajax(
			{
				url: "v1/resources/item?rs:uri=" + currentUUID,
				type: 'Put',
				contentType:'application/json',
				data: JSON.stringify(saveIdea), 
				dataType:'json',
				success: function (data) {
					app.message(data.responseText);
					currentIdeaChanged = false;
				},
				error: function (data) {
					app.message(data.responseText);
				}
			});
		}
	},
			
	deleteMapItem: function() {
		if (currentUUID!=null) {
			//trying to find next item if not found select the first one
			var nextItemId=$('#selectable .ui-selected').next().attr('id');
			if(nextItemId==null){
				nextItemId=$('#selectable li').first().attr('id');
			}
			
			$.ajax(
			{
				url: "v1/resources/item?rs:uri=" + currentUUID,
				contentType:'application/json',
				type: 'Delete',
				dataType:'json',
				success: function (data) {
					app.message(data.response + " deleted.");
					app.getMapItems();
					//opening next available mapItem or the first one (selected above) if available. return new item if list is empty 
					if(nextItemId!=null){
						app.openMapItem(nextItemId);
						$("li[id='"+nextItemId+"']").addClass('ui-selected');
					}else{
						app.newMapItem;
					}
				},
				error: function (data) {
					app.message("error by deleting.");
					//delete it when problem with json resolved
					app.message(data.response + " deleted.");
					app.getMapItems();
					//opening next available mapItem or the first one (selected above) if available. return new item if list is empty 
					if(nextItemId!=null){
						app.openMapItem(nextItemId);
						$("li[id='"+nextItemId+"']").addClass('ui-selected');
					}else{
						app.newMapItem;
					}
				}
			});
		}
	},
	
	search: function(query){
				var htm;
		$.ajax(
		{
			url: "v1/resources/search",
			dataType: 'html',
			data: {
				"rs:q" : query
			},
			accepts: {
				text: "application/xml"
			},
			async: false,
			success: function(bindings) {
				 htm = bindings;    
			}
		});
		//TODO:optimize
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
								app.openMapItem(selId);
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
					app.openMapItem(selId);
				}
			}
		});
	},
	
	onIdeaChanged: function(){
		currentIdeaChanged = true;
	},
	
	message: function(message) {
		new PNotify({
			text: message,
			shadow: true,
			hide: true,
			closer: true,
			opacity: .65,
			addclass: "stack-bottomright custom",
			stack: stack_bottomright
		});
	},
	setGoogleIcon: function() {
		var opt = {
			autoOpen: false,
			modal: true,
			width: 550,
			height:650,
			title: 'Select Google picture'
		};
		var theDialog = $("#get-google-icon-dialog").dialog(opt);
		theDialog.dialog("open");
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
		imageSearch.setSearchCompleteCallback(this, app.onGoogleSearchComplete, null);
		imageSearch.execute(keyword);
		$("#searchGoogleStr").val(keyword);
		var button = $("#searchGoogleBtn").button();
		button.click(
			function(){
				var str = $("#searchGoogleStr").val();
				imageSearch.setSearchCompleteCallback(this, app.onGoogleSearchComplete, null);
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
	}
}		
