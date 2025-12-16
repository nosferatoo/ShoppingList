import { Dialog as BottomSheetPrimitive } from "bits-ui";

import Root from "./bottom-sheet.svelte";
import Content from "./bottom-sheet-content.svelte";
import Header from "./bottom-sheet-header.svelte";
import Overlay from "./bottom-sheet-overlay.svelte";
import Portal from "./bottom-sheet-portal.svelte";
import Title from "./bottom-sheet-title.svelte";

const Trigger = BottomSheetPrimitive.Trigger;
const Close = BottomSheetPrimitive.Close;

export {
	Root,
	Content,
	Header,
	Overlay,
	Portal,
	Title,
	Trigger,
	Close,
	//
	Root as BottomSheet,
	Content as BottomSheetContent,
	Header as BottomSheetHeader,
	Overlay as BottomSheetOverlay,
	Portal as BottomSheetPortal,
	Title as BottomSheetTitle,
	Trigger as BottomSheetTrigger,
	Close as BottomSheetClose,
};
