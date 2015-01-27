//Initializing Google search engine
var imageSearch;
/*google.load('search', '1');
google.setOnLoadCallback(function(){
    imageSearch = new google.search.ImageSearch();
    }
); */
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
	}
}		
