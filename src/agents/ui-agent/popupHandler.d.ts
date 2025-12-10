import type { Page } from 'playwright';
export declare class PopupHandler {
    private page;
    constructor(page: Page);
    /**
     * Sets up automatic popup/dialog handlers
     */
    private setupPopupHandlers;
    /**
     * Waits for and handles any popups that appear
     */
    handlePopups(timeout?: number): Promise<void>;
    /**
     * Dismisses cookie banners and consent popups
     */
    dismissCookieBanners(): Promise<void>;
}
//# sourceMappingURL=popupHandler.d.ts.map