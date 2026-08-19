import { redirect } from "next/navigation"

/**
 * There used to be two Artists screens because there were two artist tables:
 * this one listed the website roster, and Studio > Artists listed the CRM
 * records that orders and appointments hang off. Migration 012 merged them into
 * one record, so listing them twice would now show the same people twice.
 *
 * Studio > Artists is the surviving list. This route stays as a redirect rather
 * than being deleted, so existing bookmarks and any link still pointing here
 * land somewhere useful instead of a 404.
 *
 * The profile form underneath it is still live and still linked from that
 * screen: /admin/artists/new and /admin/artists/[id]/edit are unaffected.
 */
export default function AdminArtistsPage() {
  redirect("/storeadmin/artists")
}
