-- Split a guest artist's display picture from their portfolio.
--
-- Every uploaded image previously rendered inline in one grid, which made the
-- section read as a contact sheet. The studio wants a single portrait up front
-- and the portfolio behind a "View Portfolio" button.
--
-- Targets the WEBSITE schema (public), not the storeadmin CRM.

alter table public.guest_spots
  add column if not exists display_image_url text;

-- Existing rows keep their first portfolio image as the display picture, so the
-- section looks unchanged until someone deliberately picks a different one.
-- Only fills blanks, so re-running never overwrites an editor's choice.
update public.guest_spots
   set display_image_url = portfolio_images[1]
 where display_image_url is null
   and array_length(portfolio_images, 1) >= 1;
