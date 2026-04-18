"use client";

import { useState } from "react";
import { ImageIcon, Users, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useToast } from "@/hooks/useToast";
import ImageManager from "@/components/admin/ImageManager";

export default function AdminSiteSettingsPage() {
  const { settings, isLoading, getSettingValue, updateSetting } =
    useSiteSettings();
  const { toast } = useToast();

  // Homepage images
  const homepageImages = getSettingValue("homepage_images");
  const [leftImage, setLeftImage] = useState<string[]>([]);
  const [rightImage, setRightImage] = useState<string[]>([]);
  const [homepageInitialized, setHomepageInitialized] = useState(false);

  // Meet the team
  const meetTeam = getSettingValue("meet_the_team");
  const [teamPhoto, setTeamPhoto] = useState<string[]>([]);
  const [teamHeading, setTeamHeading] = useState("");
  const [teamDescription, setTeamDescription] = useState("");
  const [teamInitialized, setTeamInitialized] = useState(false);

  const [savingHomepage, setSavingHomepage] = useState(false);
  const [savingTeam, setSavingTeam] = useState(false);

  // Initialize form state from settings
  if (settings.length > 0 && !homepageInitialized) {
    const hp = getSettingValue("homepage_images");
    if (hp.left_image_url) setLeftImage([hp.left_image_url]);
    if (hp.right_image_url) setRightImage([hp.right_image_url]);
    setHomepageInitialized(true);
  }

  if (settings.length > 0 && !teamInitialized) {
    const mt = getSettingValue("meet_the_team");
    if (mt.photo_url) setTeamPhoto([mt.photo_url]);
    setTeamHeading(mt.heading || "Meet the Team");
    setTeamDescription(mt.description || "");
    setTeamInitialized(true);
  }

  const saveHomepageImages = async () => {
    setSavingHomepage(true);
    try {
      await updateSetting("homepage_images", {
        left_image_url: leftImage[0] || homepageImages.left_image_url || "",
        right_image_url: rightImage[0] || homepageImages.right_image_url || "",
      });
      await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: ["/"] }),
      });
      toast.success("Homepage images updated");
    } catch {
      toast.error("Failed to update homepage images");
    } finally {
      setSavingHomepage(false);
    }
  };

  const saveMeetTeam = async () => {
    setSavingTeam(true);
    try {
      await updateSetting("meet_the_team", {
        photo_url: teamPhoto[0] || "",
        heading: teamHeading,
        description: teamDescription,
      });
      await fetch("/api/admin/revalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: ["/about"] }),
      });
      toast.success("Meet the Team updated");
    } catch {
      toast.error("Failed to update Meet the Team");
    } finally {
      setSavingTeam(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-6 h-6 border-2 border-psy-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-8">
        <h1 className="font-sans font-semibold text-2xl text-bone">
          Site Settings
        </h1>
        <p className="text-taupe text-caption mt-1">
          Manage homepage images, about page content, and other site-wide
          settings.
        </p>
      </div>

      {/* Homepage Images */}
      <section className="bg-surface border border-borderDark rounded-lg p-6 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <ImageIcon className="w-5 h-5 text-neon-purple" />
          <h2 className="font-sans font-semibold text-lg text-bone">
            Homepage Split Images
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm mb-3 text-mutedText">
              PSY Tattoos (Left Side)
            </label>
            <ImageManager
              initialImages={leftImage}
              bucket="site-settings"
              folder="homepage"
              onChange={setLeftImage}
              maxImages={1}
            />
          </div>
          <div>
            <label className="block text-sm mb-3 text-mutedText">
              PSY Shop (Right Side)
            </label>
            <ImageManager
              initialImages={rightImage}
              bucket="site-settings"
              folder="homepage"
              onChange={setRightImage}
              maxImages={1}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            variant="neon"
            onClick={saveHomepageImages}
            disabled={savingHomepage}
          >
            <Save className="w-4 h-4 mr-2" />
            {savingHomepage ? "Saving..." : "Save Homepage Images"}
          </Button>
        </div>
      </section>

      {/* Meet the Team */}
      <section className="bg-surface border border-borderDark rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="w-5 h-5 text-neon-green" />
          <h2 className="font-sans font-semibold text-lg text-bone">
            Meet the Team (About Page)
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-2 text-mutedText">
              Team Photo
            </label>
            <ImageManager
              initialImages={teamPhoto}
              bucket="site-settings"
              folder="team"
              onChange={setTeamPhoto}
              maxImages={1}
            />
          </div>
          <div>
            <label className="block text-sm mb-2 text-mutedText">
              Heading
            </label>
            <Input
              value={teamHeading}
              onChange={(e) => setTeamHeading(e.target.value)}
              placeholder="Meet the Team"
            />
          </div>
          <div>
            <label className="block text-sm mb-2 text-mutedText">
              Description
            </label>
            <textarea
              value={teamDescription}
              onChange={(e) => setTeamDescription(e.target.value)}
              placeholder="Tell visitors about your team..."
              rows={4}
              className="flex w-full border border-borderDark bg-background px-3 py-2 text-sm text-bone rounded focus:border-neon-green focus:outline-none transition-colors resize-none"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button variant="neon" onClick={saveMeetTeam} disabled={savingTeam}>
            <Save className="w-4 h-4 mr-2" />
            {savingTeam ? "Saving..." : "Save Meet the Team"}
          </Button>
        </div>
      </section>
    </>
  );
}
