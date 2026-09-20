
function stopEventPropagation(event) {
    event.stopPropagation();
}

function isKobo() {
    return 'koboApp' in window;
}

function isADE() {
    var epubReadingSystem = navigator.epubReadingSystem;
    if (epubReadingSystem) {
        return epubReadingSystem.name == 'RMSDK';
    }
    return false;
}

function isIOS() {
    var platform = navigator.platform;
    if (["iPad", "iPod", "iPhone"].includes(platform)) {
        return true;
    }
    return false;
}

function useMouselessButtons() {
    return (isADE() || isKobo()) && isIOS();
}


const ViewfinderAction = {
    none : -1,
    maximize : 0,
    goToPrev : 1,
    goToNext : 2,
    count : 3
};

class GalleryViewfinderObserver {
    constructor(owner) {
        this.owner = owner;
        this.galleryObject = owner.galleryObject;
        this.galleryElement = owner.galleryElement;
        this.viewfinderElement = owner.viewfinderElement;
    }
    
    onCurrentItemChange(oldItemIndex, newItemIndex) {}
    
    onMouseMoveInViewfinder(point) {
    }
    
    onMouseEnterViewfinder(point) {
    }
    
    onMouseLeaveViewfinder(point) {
    }
    
    onClickInViewfinder(point) {
    }
    
    onPageShow() {
        
    }
    
    onPageHide() {
        
    }
    
    onMouseEnterViewfinderChild(viewfinderChildElement) {
    }
    
    onMouseLeaveViewfinderChild(viewfinderChildElement) {
    }
    
}

class GalleryButtonsViewfinderManager extends GalleryViewfinderObserver {
    constructor(owner) {
        super(owner);
        var viewfinderElement = this.viewfinderElement;
        this.goToPrevButtonElement = viewfinderElement.getElementsByClassName("gallery-button-goToPrev")[0];
        this.goToNextButtonElement = viewfinderElement.getElementsByClassName("gallery-button-goToNext")[0];
        this.maximizeButtonElement = viewfinderElement.getElementsByClassName("gallery-button-maximize")[0];
        this.setUpGoToButtonsBounds();
        this.buttonsTimeout = null;
        this.buttonUnderMouseCursor = null;
        this.setButtonMouseEnterLeaveHandlers(this.goToPrevButtonElement);
        this.setButtonFocusHandlers(this.goToPrevButtonElement);
        this.setButtonKeyupHandlers(this.goToPrevButtonElement);
        this.setButtonMouseEnterLeaveHandlers(this.goToNextButtonElement);
        this.setButtonFocusHandlers(this.goToNextButtonElement);
        this.setButtonKeyupHandlers(this.goToNextButtonElement);
        if (this.maximizeButtonElement) {
            this.setButtonMouseEnterLeaveHandlers(this.maximizeButtonElement);
            this.setButtonFocusHandlers(this.maximizeButtonElement);
        }
    }
    
    setUpGoToButtonsBounds() {
        var preferredButtonMargin = window.getComputedStyle(this.goToPrevButtonElement).getPropertyValue("--margin");
        var minButtonMargin = 2.0;
        var preferredButtonWidth = this.goToPrevButtonElement.getBoundingClientRect().width;
        var preferredButtonLayoutWidth = preferredButtonWidth + 2 * preferredButtonMargin;
        var viewfinderWidth = this.viewfinderElement.getBoundingClientRect().width;
        var buttonLayoutWidth = preferredButtonLayoutWidth;
        if (buttonLayoutWidth > viewfinderWidth / 2) {
            // One button plus its margins must not occupy more than half the viewfinder.
            buttonLayoutWidth = viewfinderWidth / 2;
        }
        var buttonWidth = preferredButtonWidth;
        var buttonMargin = (buttonLayoutWidth - buttonWidth) / 2;
        if (buttonMargin < minButtonMargin) {
            // The margin would result less than the minimum.
            // Shrink the button to ensure a minimum margin.
            buttonMargin = minButtonMargin;
            buttonWidth = buttonLayoutWidth - 2 * buttonMargin;
            if (buttonWidth <= 0) {
                // The available width (half of the viewfinder) is less than the minimum margins.
                // Use all the available width for the button.
                buttonMargin = 0;
                buttonWidth = buttonLayoutWidth / 2;
            }
        }
        this.goToPrevButtonElement.style.left = buttonMargin + "px";
        this.goToPrevButtonElement.style.width = buttonWidth + "px";
        this.goToPrevButtonElement.style.height = buttonWidth + "px";
        this.goToNextButtonElement.style.right = buttonMargin + "px";
        this.goToNextButtonElement.style.width = buttonWidth + "px";
        this.goToNextButtonElement.style.height = buttonWidth + "px";
        this.goToActiveWidth = 0.2 * viewfinderWidth;
        if (this.goToActiveWidth < buttonLayoutWidth) {
            // The area where a click is equivalent to clicking a go-to button
            // shouldn't be less than the width of the button plus the button margins.
            this.goToActiveWidth = buttonLayoutWidth;
        }
    }
    
    handleNextPreviousButtonKeyUpEvent(e) {
        var movePrevious = false;
        var moveNext = false;
        if (e.keyCode == 13 || e.keyCode == 32) /* Spacebar or Enter */ {
            e.preventDefault();
            if (e.target == this.goToPrevButtonElement) {
                movePrevious = true;
            }
            else if(e.target == this.goToNextButtonElement) {
                moveNext = true;
            }
        }
        else if (e.keyCode == 37) /* Left Arrow */ {
            movePrevious = true;
        }
        else if (e.keyCode == 39) /* Right Arrow */ {
            moveNext = true;
        }
        if (movePrevious) {
            if (this.galleryObject.currentItemIndex > 0) {
                this.galleryObject.goToPrevFrame();
                if (this.galleryObject.currentItemIndex == 0) {
                    this.goToNextButtonElement.focus();
                }
            }
        }
        if (moveNext) {
            if (this.galleryObject.currentItemIndex < this.galleryObject.itemCount - 1) {
                this.galleryObject.goToNextFrame();
                if (this.galleryObject.currentItemIndex == this.galleryObject.itemCount - 1) {
                    this.goToPrevButtonElement.focus();
                }
            }
        }
        if (movePrevious || moveNext) {
            this.updateButtonsDisplayState();
        }
    }
    
    setButtonMouseEnterLeaveHandlers(buttonElement) {
        buttonElement.onmouseenter = this.onMouseEnterButton.bind(this, buttonElement);
        buttonElement.onmouseleave = this.onMouseLeaveButton.bind(this, buttonElement);
    }
    
    setButtonFocusHandlers(buttonElement) {
        buttonElement.onfocus = this.onButtonGainedFocus.bind(this, buttonElement);
        buttonElement.onblur = this.onButtonLostFocus.bind(this, buttonElement);
    }
    
    setButtonKeyupHandlers(buttonElement) {
        buttonElement.onkeyup = this.handleNextPreviousButtonKeyUpEvent.bind(this);
    }
    
    setButtonsVisibility(showPrev, showNext, showMaximize) {
        Gallery.setButtonVisibility(this.goToPrevButtonElement, showPrev);
        Gallery.setButtonVisibility(this.goToNextButtonElement, showNext);
        Gallery.setButtonVisibility(this.maximizeButtonElement, showMaximize);
    }
    
    hideButtonsNotUnderMouseCursor() {
        var showPrev = this.buttonUnderMouseCursor == this.goToPrevButtonElement;
        var showNext = this.buttonUnderMouseCursor == this.goToNextButtonElement;
        var showMaximize = this.buttonUnderMouseCursor == this.maximizeButtonElement;
        this.setButtonsVisibility(showPrev, showNext, showMaximize);
    }
    
    startButtonsTimeout() {
        this.buttonsTimeout = setTimeout(function() { this.hideButtonsNotUnderMouseCursor() }.bind(this), 2500);
    }
    
    killButtonsTimeout() {
        if (this.buttonsTimeout) {
            clearTimeout(this.buttonsTimeout);
            this.buttonsTimeout = null;
        }
    }
    
    hideButtonsWithoutDelay() {
        this.killButtonsTimeout();
        this.setButtonsVisibility(false, false, false);
    }
    
    viewfinderActionForMousePosition(point) {
        var itemCount = this.galleryObject.itemCount;
        var currentItemIndex = this.galleryObject.currentItemIndex;
        var viewfinderWidth = this.viewfinderElement.getBoundingClientRect().width;
        var x = point.x;
        
        if (currentItemIndex > 0) {
            if (x < this.goToActiveWidth) {
                return ViewfinderAction.goToPrev;
            }
        }
        var showNext = false;
        if (currentItemIndex + 1 < itemCount) {
            if (viewfinderWidth - x < this.goToActiveWidth) {
                return ViewfinderAction.goToNext;
            }
        }
        if (this.maximizeButtonElement) {
            return ViewfinderAction.maximize;
        }
        return ViewfinderAction.none;
    }
    
    updateButtonsVisibility(point) {
        var action = this.viewfinderActionForMousePosition(point);
        var showPrev = action == ViewfinderAction.goToPrev;
        var showNext = action == ViewfinderAction.goToNext;
        var showMaximize = true;
        
        if (!this.maximizeButtonElement) {
            this.viewfinderElement.style.cursor = (showPrev || showNext) ? 'pointer' : 'default';
        }
        this.setButtonsVisibility(showPrev, showNext, showMaximize);
        this.updateButtonsDisplayState();
    }

    updateButtonsDisplayState() {
        // Update display style of the next/previous buttons so that they are present/removed from the
        // focus loop at the correct indexes.
        var itemCount = this.galleryObject.itemCount;
        var currentIndex = this.galleryObject.currentItemIndex;
        if (currentIndex == 0) {
            this.goToPrevButtonElement.tabIndex = -1;
            this.goToPrevButtonElement.style.display = 'none';
        }
        else {
            this.goToPrevButtonElement.tabIndex = 0;
            this.goToPrevButtonElement.style.display = 'block';
        }
        
        if (currentIndex == itemCount - 1) {
            this.goToNextButtonElement.tabIndex = -1;
            this.goToNextButtonElement.style.display = 'none';
        }
        else {
            this.goToNextButtonElement.tabIndex = 0;
            this.goToNextButtonElement.style.display = 'block';
        }
    }
    
    onMouseMoveInViewfinder(point) {
        this.killButtonsTimeout();
        this.updateButtonsVisibility(point);
        this.startButtonsTimeout();
    }
    
    onMouseEnterViewfinder(point) {
    }
    
    onMouseLeaveViewfinder(point) {
        this.hideButtonsWithoutDelay();
    }
    
    onClickInViewfinder(point) {
        this.killButtonsTimeout();
        var action = this.viewfinderActionForMousePosition(point);
        switch (action) {
            case ViewfinderAction.goToPrev:
                this.galleryObject.goToPrevFrame();
                break;
            case ViewfinderAction.goToNext:
                this.galleryObject.goToNextFrame();
                break;
            case ViewfinderAction.maximize:
                if (this.maximizeButtonElement) {
                    this.galleryObject.maximizeFrame();
                }
                break;
        }
        this.updateButtonsVisibility(point);
        this.startButtonsTimeout();
    }
    
    onPageShow() {
        this.hideButtonsWithoutDelay();
    }
    
    onPageHide() {
        this.hideButtonsWithoutDelay();
    }
    
    onMouseEnterButton(buttonElement) {
        this.buttonUnderMouseCursor = buttonElement;
    }
    
    onMouseLeaveButton(buttonElement) {
        this.buttonUnderMouseCursor = null;
    }
    
    onButtonGainedFocus(buttonElement) {
        Gallery.setButtonVisibility(buttonElement, true);
    }
    
    onButtonLostFocus(buttonElement) {
        Gallery.setButtonVisibility(buttonElement, false);
    }
}

class GalleryCurrentItemObserver {
    constructor(galleryObject) {
        this.galleryObject = galleryObject;
    }
    
    onCurrentItemChange(oldItemIndex, newItemIndex, animate) {
        
    }
}

class GalleryImageAndCaptionRollsManager {
    constructor(galleryObject) {
        this.galleryObject = galleryObject;
        var galleryElement = galleryObject.galleryElement;
        this.imageRollElement = galleryElement.getElementsByClassName("gallery-image-roll")[0];
        if (galleryElement.getElementsByClassName("gallery-caption").length > 1) {
            this.captionRollElement = galleryElement.getElementsByClassName("gallery-caption-roll")[0];
        }
    }
    
    removeTransition() {
        this.imageRollElement.classList.remove("gallery-image-roll-transition");
        if (this.captionRollElement) {
            this.captionRollElement.style.visibility = 'unset';
        }
    }
    
    onCurrentItemChange(oldItemIndex, newItemIndex, animate) {
        this.removeTransition();
        if (animate) {
            if (this.captionRollElement) {
                this.captionRollElement.style.visibility = 'hidden';
            }
            this.imageRollElement.classList.add("gallery-image-roll-transition");
            this.imageRollElement.addEventListener("transitionend", this.removeTransition.bind(this));
        }
        this.imageRollElement.style.left = -(newItemIndex * 100) + "%";
        if (this.captionRollElement) {
            this.captionRollElement.style.left = -(newItemIndex * 100) + "%";
        }
    }
}

class GalleryAccessibilityManager extends GalleryCurrentItemObserver {
    constructor(galleryObject) {
        super(galleryObject);
        this.announcementRegionElement =  this.galleryObject.galleryElement.getElementsByClassName("ax-announcement-region")[0];
        if (this.galleryObject.galleryElement.getElementsByClassName("gallery-caption-roll").length > 0) {
            this.initializeCaptionIDs();
        }
    }

    onCurrentItemChange(oldItemIndex, newItemIndex, animate) {
        var images = Array.prototype.slice.call(this.galleryObject.galleryElement.getElementsByClassName("gallery-full-image"));
        var captions = [];
        if (this.galleryObject.galleryElement.getElementsByClassName("gallery-caption-roll").length > 0) {
            var captionRollElement = this.galleryObject.galleryElement.getElementsByClassName("gallery-caption-roll")[0];
            captions = Array.prototype.slice.call(captionRollElement.getElementsByClassName("gallery-caption"));
        }
        images.forEach(function(image, imageIndex) {
                       if(captions.length > 0) {
                       var captionIndex = captions.length > 1 ? imageIndex : 0;
                       var caption = captions[captionIndex];
                       var captionTextElement = this.getFirstParagraphElementOfCaption(caption);
                       if (captionTextElement) {
                       var shouldHide = captions.length > 1 && newItemIndex != captionIndex;
                       captionTextElement.setAttribute("aria-hidden", shouldHide ? "true" : "false");
                       }

                       if (newItemIndex == imageIndex) {
                       this.announceForAccessibility(images[newItemIndex].getAttribute("aria-label"));
                       }
                       }
                       }, this);
    }

    initializeCaptionIDs() {
        if (this.galleryObject.galleryElement.getElementsByClassName("gallery-caption-roll").length > 0) {
            var captionRollElement = this.galleryObject.galleryElement.getElementsByClassName("gallery-caption-roll")[0];
            var captions = Array.prototype.slice.call(captionRollElement.getElementsByClassName("gallery-caption"));
            var galleryObject = this.galleryObject;
            captions.forEach(function(caption, index) {
                             var captionTextElement = this.getFirstParagraphElementOfCaption(caption);
                             if (captionTextElement) {
                             captionTextElement.id = galleryObject.getCaptionElementIDForIndex(index);
                             }
                             }, this);
        }
    }

    getFirstParagraphElementOfCaption(caption) {
        var paragraphTagNameArray = ["p", "li" ];
        for (var index = 0; index < paragraphTagNameArray.length; index++) {
            var paragraphTagName = paragraphTagNameArray[index];
            var paragraphElementList = caption.getElementsByTagName(paragraphTagName);
            if (paragraphElementList.length > 0) {
                return paragraphElementList[0];
            }
        }
        // no paragraphs/list items
        return null;
    }

    announceForAccessibility(announcement) {
        var liveRegionElement = this.announcementRegionElement;
        setTimeout(function() {
                   liveRegionElement.setAttribute("aria-label", announcement);
                   }, 500);

    }
}

class GalleryDotManager extends GalleryCurrentItemObserver {
    constructor(galleryObject) {
        super(galleryObject);
        this.dotContainerElement = galleryObject.galleryElement.getElementsByClassName("gallery-dot-container")[0];
        this.setupDotElementKeyupHandlers();
    }
    
    setupDotElementKeyupHandlers() {
        var dotElements = Array.prototype.slice.call(this.dotContainerElement.getElementsByClassName("gallery-dot-selectable"));
        dotElements.concat(Array.prototype.slice.call(this.dotContainerElement.getElementsByClassName("gallery-dot-current")));
        var handler = this.handleDotElementKeyUpEvent.bind(this);
        dotElements.forEach(function(dotElement) {
                            dotElement.onkeyup = handler;
                            });
    }
    
    handleDotElementKeyUpEvent(e) {
        var element = e.target;
        var currentIndex = this.galleryObject.currentItemIndex;
        var itemCount = this.galleryObject.itemCount;
        if (e.keyCode == 37) /* Left Arrow */ {
            if (currentIndex > 0) {
                this.galleryObject.goToPrevFrame();
                var selectedDotElement = Array.prototype.slice.call(this.dotContainerElement.getElementsByClassName("gallery-dot-current"))[0];
                selectedDotElement.focus();
            }
        }
        else if (e.keyCode == 39) /* Right Arrow */ {
            if (currentIndex < itemCount - 1) {
                this.galleryObject.goToNextFrame();
                var selectedDotElement = Array.prototype.slice.call(this.dotContainerElement.getElementsByClassName("gallery-dot-current"))[0];
                selectedDotElement.focus();
            }
        }
    }
    
    deselectCurrentDot() {
        var currentDotGroupCollection = this.dotContainerElement.getElementsByClassName("gallery-dot-current");
        if (currentDotGroupCollection.length > 0) {
            currentDotGroupCollection[0].setAttribute("aria-checked", "false");
            currentDotGroupCollection[0].tabIndex = -1;
            currentDotGroupCollection[0].className = "gallery-dot-selectable";
        }
    }
    
    onCurrentItemChange(oldItemIndex, newItemIndex, animate) {
        this.deselectCurrentDot();
        var newCurrentDot = this.dotContainerElement.getElementsByClassName("gallery-dot-selectable")[newItemIndex];
        newCurrentDot.setAttribute("aria-checked", "true");
        newCurrentDot.tabIndex = 0;
        newCurrentDot.className = "gallery-dot-current";

        // work around a bug where WebKit will not render DOM updates sometimes, by temporarily
        // setting the div to display:none, and then back to its previous value.
        var dotDisplay = newCurrentDot.style.display;
        newCurrentDot.style.display = "none";

        setTimeout(function() {
            newCurrentDot.style.display = dotDisplay;
        }, 0);
    }
}

class GalleryMouselessButtonsManager extends GalleryCurrentItemObserver {
    constructor(galleryObject) {
        super(galleryObject);
        var viewfinderElement = galleryObject.viewfinderElement;
        this.goToPrevButtonElement = viewfinderElement.getElementsByClassName("gallery-button-goToPrev")[0];
        this.goToPrevButtonElement.onclick = galleryObject.goToPrevFrame.bind(galleryObject);
        this.goToPrevButtonElement.onkeyup = this.handleNextPreviousButtonKeyUpEvent;
        this.goToNextButtonElement = viewfinderElement.getElementsByClassName("gallery-button-goToNext")[0];
        this.goToNextButtonElement.onclick = galleryObject.goToNextFrame.bind(galleryObject);
        this.goToNextButtonElement.onkeyup = this.handleNextPreviousButtonKeyUpEvent;
        this.maximizeButtonElement = viewfinderElement.getElementsByClassName("gallery-button-maximize")[0];
        if (this.maximizeButtonElement) {
            this.maximizeButtonElement.onclick = galleryObject.maximizeFrame.bind(galleryObject);
        }
    }
    
    onCurrentItemChange(oldItemIndex, newItemIndex, animate) {
        var itemCount = this.galleryObject.itemCount;
        var showNext = newItemIndex + 1 < this.galleryObject.itemCount;
        var showPrev = newItemIndex > 0;
        Gallery.setButtonVisibility(this.goToPrevButtonElement, showPrev);
        Gallery.setButtonVisibility(this.goToNextButtonElement, showNext);
        Gallery.setButtonVisibility(this.maximizeButtonElement, true);
    }
}


class GalleryViewfinderManager {
    addViewfinderHandlers() {
        this.viewfinderElement.onclick = this.onClickInViewfinder.bind(this);
        this.viewfinderElement.onmouseenter = this.onMouseEnterViewfinder.bind(this);
        this.viewfinderElement.onmouseleave = this.onMouseLeaveViewfinder.bind(this);
        this.viewfinderElement.onmousemove = this.onMouseMoveInViewfinder.bind(this);
    }
    
    addObservers() {
        this.viewfinderObserverArray = [];
        if (!useMouselessButtons()) {
            this.viewfinderObserverArray.push(new GalleryButtonsViewfinderManager(this));
        }
    }
    
    constructor (galleryObject) {
        this.galleryObject = galleryObject;
        this.galleryElement = galleryObject.galleryElement;
        this.viewfinderElement = this.galleryElement.getElementsByClassName("gallery-image-viewfinder")[0];
        
        this.addViewfinderHandlers();
        this.addObservers();
    }
    
    viewfinderMouseEventCoordinates(event) {
        var viewfinderBounds = this.viewfinderElement.getBoundingClientRect();
        var point = { "x" : event.clientX - viewfinderBounds.left, "y" : event.clientY - viewfinderBounds.top };
        return point;
    }
    
    onMouseEventInViewfinder(event, handlerName) {
        try {
            var point = this.viewfinderMouseEventCoordinates(event);
            this.viewfinderObserverArray.forEach(function (observer) {
                                                 observer[handlerName](point);
                                                 });
            stopEventPropagation(event);
        }
        catch (error) {
        }
    }
    
    onMouseMoveInViewfinder(event) {
        this.onMouseEventInViewfinder(event, "onMouseMoveInViewfinder");
    }
    
    onMouseEnterViewfinder(event) {
        this.onMouseEventInViewfinder(event, "onMouseEnterViewfinder");
    }
    
    onMouseLeaveViewfinder(event) {
        this.onMouseEventInViewfinder(event, "onMouseLeaveViewfinder");
    }
    
    onClickInViewfinder(event) {
        this.onMouseEventInViewfinder(event, "onClickInViewfinder");
    }
    
    onPageShow() {
        this.viewfinderObserverArray.forEach(function (observer) {
                                             observer.onPageShow();
                                             });
    }
    
    onPageHide() {
        this.viewfinderObserverArray.forEach(function (observer) {
                                             observer.onPageHide();
                                             });
    }
    
    onCurrentItemChange(oldItemIndex, newItemIndex) {
        this.viewfinderObserverArray.forEach(function(observer) {
                                             observer.onCurrentItemChange(oldItemIndex, newItemIndex);
                                             });
    }
    
}

class TouchManager {
    constructor(galleryObject) {
        this.galleryObject = galleryObject;
        this.viewfinderElement = galleryObject.viewfinderElement;
        this.viewfinderBounds = this.viewfinderElement.getBoundingClientRect();
        this.frameWidth = this.viewfinderBounds.width;
        this.dragTouchID = null;
        this.goToPrevButtonElement = this.viewfinderElement.getElementsByClassName("gallery-button-goToPrev")[0];
        this.goToNextButtonElement = this.viewfinderElement.getElementsByClassName("gallery-button-goToNext")[0];
        var element = this.viewfinderElement;
        element.addEventListener("touchstart", this.onTouchStart.bind(this), true);
        element.addEventListener("touchmove", this.onTouchMove.bind(this), true);
        element.addEventListener("touchend", this.onTouchEnd.bind(this), true);
        element.addEventListener("touchcancel", this.onTouchCancel.bind(this), true);
    }
    
    viewfinderPositionOfChangedTouchMatchingDragID(event) {
        if (this.dragTouchID) {
            var changedTouchCount = event.changedTouches.length;
            for (var changedTouchIndex = 0; changedTouchIndex < changedTouchCount; changedTouchIndex++) {
                var changedTouch = event.changedTouches[changedTouchIndex];
                if (changedTouch.identifier == this.dragTouchID) {
                    var point = { "x" : changedTouch.pageX - this.viewfinderBounds.left, "y" : changedTouch.pageY - this.viewfinderBounds.top };
                    return point;
                }
            }
        }
        return null;
    }
    
    onTouchEvent(event, doDump) {
        if (doDump) {
        }
        stopEventPropagation(event);
        event.preventDefault();
        if (event.changedTouches.length == 0) {
        }
    }
    
    onTouchStart(event) {
        try {
            this.onTouchEvent(event, true);
            if (!this.dragTouchID) {
                if (event.changedTouches.length > 0) {
                    var changedTouch = event.changedTouches[0];
                    this.dragTouchID = changedTouch.identifier;
                    this.dragStartPoint = this.viewfinderPositionOfChangedTouchMatchingDragID(event);
                    this.dragStartTime = new Date().getTime();
                    this.dragStartX = this.dragStartPoint.x;
                    this.dragStartItemIndex = this.galleryObject.currentItemIndex;
                    this.lastTouchPosition = this.dragStartPoint;
                }
            }
        }
        catch (error) {
        }
    }
    
    onTouchMove(event) {
        try {
            this.onTouchEvent(event, false);
            var changedTouchPosition = this.viewfinderPositionOfChangedTouchMatchingDragID(event);
            if (changedTouchPosition) {
                var dragCurrX = changedTouchPosition.x;
                var deltaX = dragCurrX - this.dragStartX;
                var relativeDeltaX = deltaX / this.frameWidth;
                var newItemIndex = this.dragStartItemIndex - relativeDeltaX;
                if (newItemIndex >= 0 && newItemIndex <= this.galleryObject.itemCount - 1) {
                    this.galleryObject.changeCurrentItemIndex(newItemIndex, false);
                }
                this.lastTouchPosition = changedTouchPosition;
            }
        }
        catch (error) {
        }
    }
    
    onTouchEndOrCancel(event) {
        var changedTouchPosition = this.viewfinderPositionOfChangedTouchMatchingDragID(event);
        if (changedTouchPosition) {
            var dragEndPoint = changedTouchPosition;
            var dragEndTime = new Date().getTime();
            var didChangeIndex = false;
            var endItemIndex = this.galleryObject.currentItemIndex;
            var intEndItemIndex = Math.round(endItemIndex);
            var deltaT = dragEndTime - this.dragStartTime;
            // If duration short enough.
            if (deltaT < 250) {
                // If it hasn't resulted in a current item change.
                if (intEndItemIndex == this.dragStartItemIndex) {
                    var absDeltaX = Math.abs(dragEndPoint.x-this.dragStartPoint.x);
                    var absDeltaY = Math.abs(dragEndPoint.y-this.dragStartPoint.y);
                    // If absDeltaX is not trivially small
                    // and absDeltaY is no larger than a fraction of absDeltaX.
                    if (absDeltaX >= 50 && absDeltaY <= 0.4 * absDeltaX) {
                        if (endItemIndex > intEndItemIndex) {
                            if (intEndItemIndex < this.galleryObject.itemCount - 1) {
                                intEndItemIndex++;
                                didChangeIndex = true;
                            }
                        } else if (endItemIndex < intEndItemIndex) {
                            if (intEndItemIndex > 0) {
                                intEndItemIndex--;
                                didChangeIndex = true;
                            }
                        }
                    }
                }
            }
            
            this.galleryObject.changeCurrentItemIndex(intEndItemIndex, true);
            
            if (!didChangeIndex) {
                // see if we can handle this as a tap
                if (this.dragStartPoint.x == dragEndPoint.x && this.dragStartPoint.y == dragEndPoint.y) {
                    var viewfinderBounds = this.viewfinderElement.getBoundingClientRect();
                    var prevButtonBounds = this.goToPrevButtonElement.getBoundingClientRect();
                    var nextButtonBounds = this.goToNextButtonElement.getBoundingClientRect();
                    var pointInViewfinder = { "x" : event.changedTouches[0].clientX - viewfinderBounds.left, "y" : event.changedTouches[0].clientY - viewfinderBounds.top };
                    prevButtonBounds.x -= viewfinderBounds.x;
                    prevButtonBounds.y -= viewfinderBounds.y;
                    nextButtonBounds.x -= viewfinderBounds.x;
                    nextButtonBounds.y -= viewfinderBounds.y;
                    
                    var x = pointInViewfinder.x;
                    var y = pointInViewfinder.y;
                    var gotoPrev = prevButtonBounds.x <= x && x <= prevButtonBounds.x + prevButtonBounds.width && prevButtonBounds.y <= y && y <= prevButtonBounds.y + prevButtonBounds.height;
                    var gotoNext = nextButtonBounds.x <= x && x <= nextButtonBounds.x + nextButtonBounds.width && nextButtonBounds.y <= y && y <= nextButtonBounds.y + nextButtonBounds.height;
                    
                    if (gotoPrev) {
                        if (this.galleryObject.currentItemIndex > 0)  {
                            this.galleryObject.goToPrevFrame();
                        }
                    }
                    else if (gotoNext) {
                        if (this.galleryObject.currentItemIndex < this.galleryObject.itemCount - 1) {
                            this.galleryObject.goToNextFrame();
                        }
                    }
                }
            }
            
            this.dragStartX = null;
            this.dragStartItemIndex = null;
            this.dragTouchID = null;
            this.lastTouchPosition = null;
        }
    }
    
    onTouchEnd(event) {
        try {
            this.onTouchEvent(event, true);
            this.onTouchEndOrCancel(event);
        }
        catch (error) {
        }
    }
    
    onTouchCancel(event) {
        try {
            this.onTouchEvent(event, true);
            this.onTouchEndOrCancel(event);
        }
        catch (error) {
        }
    }
}

class Gallery {
    createImageRollElement() {
        this.viewfinderElement = this.galleryElement.getElementsByClassName("gallery-image-viewfinder")[0];
        this.imageRollElement = this.viewfinderElement.getElementsByClassName("gallery-image-roll")[0];
        
        var imageFrameElementArray = Array.prototype.slice.call(this.viewfinderElement.getElementsByClassName("gallery-image-cropper"));
        this.itemCount = imageFrameElementArray.length;
    }
    
    completeItemCaptionElements() {
        //this.itemCaptionRolodexElement = this.galleryElement.getElementsByClassName("gallery-item-caption-rolodex")[0];
        //this.itemCaptionRolodexElement.onclick = stopEventPropagation;
    }
    
    addSelectionDots() {
        this.dotContainerElement = this.galleryElement.getElementsByClassName("gallery-dot-container")[0];
        this.innerDotContainerElement = this.dotContainerElement.getElementsByClassName("gallery-dot-inner-container")[0];
        if (this.innerDotContainerElement.getBoundingClientRect().width < this.dotContainerElement.getBoundingClientRect().width) {
            var dotExtenderElementArray = Array.prototype.slice.call(this.innerDotContainerElement.getElementsByClassName("gallery-dot-extender"));
            for (var itemIndex = 0; itemIndex < this.itemCount; itemIndex++) {
                var dotExtenderElement = dotExtenderElementArray[itemIndex];
                dotExtenderElement.onclick = this.selectFrame.bind(this, itemIndex);

                var captionIndex = this.galleryElement.getElementsByClassName("gallery-caption").length > 1 ? itemIndex : 0;
                var captionID = this.getCaptionElementIDForIndex(captionIndex);
                var dotElement = dotExtenderElement.getElementsByTagName("span")[0];
                dotElement.setAttribute("aria-describedby", captionID);
            }
        } else {
            this.innerDotContainerElement.style.display = 'none';
        }
    }
    
    completeTree() {
        this.createImageRollElement();
        this.completeItemCaptionElements();
        if (!this.isFullscreen()) {
            this.addSelectionDots();
        }
    }
    
    addWindowEventListeners() {
        window.addEventListener("pageshow", this.onPageShow.bind(this));
        window.addEventListener("pagehide", this.onPageHide.bind(this));
    }
    
    createObservers() {
        this.currentItemObserverArray = [];
        if (!this.isFullscreen()) {
            this.currentItemObserverArray.push(new GalleryDotManager(this));
            if (useMouselessButtons()) {
                this.currentItemObserverArray.push(new GalleryMouselessButtonsManager(this));
            }
        }
        this.currentItemObserverArray.push(new GalleryAccessibilityManager(this));
    }
    
    startUp() {
        this.currentItemIndex = -1;
        var newItemIndex = parseInt(this.galleryElement.getAttribute("data-current-item-index"));
        this.changeCurrentItemIndex(newItemIndex, false);
        
    }
    
    constructor (galleryElement) {
        this.galleryElement = galleryElement;
        
        this.completeTree();
        
        this.viewfinderManager = new GalleryViewfinderManager(this);
        
        this.addWindowEventListeners();
        
        this.createObservers();
        this.imageAndCaptionRollsManager = new GalleryImageAndCaptionRollsManager(this);
        
        if (!useMouselessButtons()) {
            this.touchManager = new TouchManager(this);
        }
        
        this.startUp();
    }
    
    isFullscreen() {
        return false;
    }
    
    changeCurrentItemIndex(newItemIndex, animate) {
        if (this.currentItemIndex != newItemIndex) {
            if (Math.abs(newItemIndex - this.currentItemIndex) > 1.0) {
                // Animation is supported only between neighbouring frames.
                animate = false;
            }
            this.imageAndCaptionRollsManager.onCurrentItemChange(this.currentItemIndex, newItemIndex, animate);
            var intCurrentItemIndex = Math.round(this.currentItemIndex);
            var intNewItemIndex = Math.round(newItemIndex);
            if (intNewItemIndex != intCurrentItemIndex) {
                this.onCurrentItemChange(intCurrentItemIndex, intNewItemIndex, animate);
                this.galleryElement.setAttribute("data-current-item-index", intNewItemIndex);
            }
            this.currentItemIndex = newItemIndex;
            this.updateImagesAXVisibility();
        }
    }
    
    updateImagesAXVisibility() {
        var currentIndex = this.currentItemIndex;
        var images = Array.prototype.slice.call(this.galleryElement.getElementsByClassName("gallery-full-image"));
        images.forEach(function(image, index) {
                       image.setAttribute("aria-hidden", index == currentIndex ? "false" : "true");
                       });
    }
    
    goToPrevFrame() {
        var currentItemIndex = this.currentItemIndex;
        this.changeCurrentItemIndex(currentItemIndex-1, true);
    }
    
    goToNextFrame() {
        var currentItemIndex = this.currentItemIndex;
        this.changeCurrentItemIndex(currentItemIndex+1, true);
    }
    
    selectFrame(newItemIndex) {
        this.changeCurrentItemIndex(newItemIndex, true);
    }
    
    maximizeFrame() {
    }
    
    onCurrentItemChange(oldItemIndex, newItemIndex, animate) {
        this.currentItemObserverArray.forEach(function(observer) {
                                              observer.onCurrentItemChange(oldItemIndex, newItemIndex, animate);
                                              });
        
        this.viewfinderManager.onCurrentItemChange(oldItemIndex, newItemIndex);
    }
    
    onPageShow() {
        this.viewfinderManager.onPageShow();
    }
    
    onPageHide() {
        this.viewfinderManager.onPageHide();
    }
    
    getCaptionElementIDForIndex(index) {
        var captionIndex = index+1;
        return this.galleryElement.id + "-caption-" + captionIndex;
    }
    
    static setButtonVisibility(buttonElement, visible) {
        if (buttonElement) {
            buttonElement.style.opacity = visible ? 1.0 : 0.0;
        }
    }
}

class RegularGallery extends Gallery {
    static setDisplayToNoneForElementsOfClass(className) {
        var elementArray = Array.prototype.slice.call(document.getElementsByClassName(className));
        elementArray.forEach(
                             function(element) {
                             element.style.display = 'none';
                             });
    }
    
    static loadGalleries() {
        this.setDisplayToNoneForElementsOfClass("gallery-fallback");
        this.setDisplayToNoneForElementsOfClass("gallery-fallback-separator");
        
        var galleryElementArray = Array.prototype.slice.call(document.getElementsByClassName("gallery"));
        galleryElementArray.forEach(function(galleryElement) {
                                    galleryElement.style.display = '';
                                    new RegularGallery(galleryElement);
                                    });
    }
}


class WebVideo {
    static replaceHyperlinkedImageWithInlineFrame(webVideoAnchorElement, prefixMappings) {
        try {
            var movieURLString = webVideoAnchorElement.getAttribute("href");
            if (movieURLString) {
                var embedMovieURLString = null;
                for (var prefix in prefixMappings) {
                    if (movieURLString.startsWith(prefix)) {
                        var mapping = prefixMappings[prefix];
                        embedMovieURLString = mapping + movieURLString.substring(prefix.length);
                        break;
                    }
                }

                if (embedMovieURLString) {
                    webVideoAnchorElement.removeAttribute("href");
                    var imageElement = webVideoAnchorElement.getElementsByTagName("img")[0];
                    var imageElementBounds = imageElement.getBoundingClientRect();
                    var videoWidthString = "100%";
                    var videoHeightString = "100%";
                    var aspectRatio = imageElement.style.getPropertyValue("--aspect-ratio");
                    if (aspectRatio.length > 0) {
                        var videoWidth = imageElementBounds.width;
                        var videoHeight = videoWidth / aspectRatio;
                        videoWidthString = videoWidth + "px";
                        videoHeightString = videoHeight + "px";
                    }
                    var iframeElement = document.createElement("iframe");
                    iframeElement.setAttribute("src", embedMovieURLString);
                    iframeElement.className = "web-video";
                    iframeElement.setAttribute("width", videoWidthString);
                    iframeElement.setAttribute("height", videoHeightString);
                    iframeElement.style.display = 'none';
                    var webVideoParentElement = webVideoAnchorElement.parentNode;
                    webVideoParentElement.insertBefore(iframeElement, webVideoAnchorElement);
                    iframeElement.onload = function() {
                        webVideoAnchorElement.parentNode.removeChild(webVideoAnchorElement);
                        iframeElement.style.display = 'unset';
                    }
                }
            }
        }
        catch (error) {
        }
}
    
    static onBodyLoad() {
        // Set the following two flags according to how well the reader supports the type of Web video.
        var youtubeIsOK = true;
        var vimeoIsOK = true;
        var prefixMappings = {};
        if (vimeoIsOK) {
            prefixMappings["https://vimeo.com/"] = "https://player.vimeo.com/video/";
        }
        if (youtubeIsOK) {
            prefixMappings["https://www.youtube.com/embed/"] = "https://www.youtube.com/watch?v=";
        }
        // Keep the original book's clickable video pictures.
        // Open YouTube in a new browser tab instead of replacing the picture
        // with an inline player, which works more reliably on Safari/GitHub Pages.
        var webVideoAnchorElementArray = Array.prototype.slice.call(document.getElementsByClassName("web-video"));
        webVideoAnchorElementArray.forEach(function(webVideoAnchorElement){
            webVideoAnchorElement.setAttribute("target", "_blank");
            webVideoAnchorElement.setAttribute("rel", "noopener noreferrer");
        });
    }
}


function Body_onLoad() {
    RegularGallery.loadGalleries();
    WebVideo.onBodyLoad();
}

