import { mkdir, writeFile } from "fs/promises";

const createAboutUsJSON = async () => {
    const filename = "about_us.json";
    const structure = {};
    await writeFile(`./static/${filename}`, JSON.stringify(structure), { flag: "wx" }).catch((e) => console.log(e));
};

const createBannerJSON = async () => {
    const filename = "banner.json";
    const structure = { bgImage: "", bgColor: "", text: "", code: "", link: "", endDate: "", status: "active" };
    await writeFile(`./static/${filename}`, JSON.stringify(structure), { flag: "wx" }).catch((e) => console.log(e));
};

const createContactInfoJSON = async () => {
    const filename = "contact_info.json";
    const structure = {
        tel: "",
        email: "",
        post_code: "",
        address: "",
        socials: { telegram: "", instagram: "" },
        location: { lat: "35.6930971", lng: "51.386023", z: 15 },
    };
    await writeFile(`./static/${filename}`, JSON.stringify(structure), { flag: "wx" }).catch((e) => console.log(e));
};

const createLatestNewsJSON = async () => {
    const filename = "latest_news.json";
    const structure = { title: "", text: "", link: "", link_text: "", status: "deactive", video: "", videoType: "file" };
    await writeFile(`./static/${filename}`, JSON.stringify(structure), { flag: "wx" }).catch((e) => console.log(e));
};

const createPrivacyPolicyJSON = async () => {
    const filename = "privacy_policy.json";
    const structure = {};
    await writeFile(`./static/${filename}`, JSON.stringify(structure), { flag: "wx" }).catch((e) => console.log(e));
};

const createTermsAndConditionsJSON = async () => {
    const filename = "terms_and_conditions.json";
    const structure = {};
    await writeFile(`./static/${filename}`, JSON.stringify(structure), { flag: "wx" }).catch((e) => console.log(e));
};

export default async () => {
    const staticFolderList = [
        "static",
        "storage",
        "storage/private",
        "storage/private/course_videos",
        "storage/public",
        "storage/public/article_images",
        "storage/public/course_exercise_files",
        "storage/public/course_group_icons",
        "storage/public/course_images",
        "storage/public/user_avatars",
    ];

    for (let i = 0; i < staticFolderList.length; i++) await mkdir(`./${staticFolderList[i]}`, { recursive: true }).catch((e) => console.log(e));
    await Promise.all([
        createAboutUsJSON(),
        createBannerJSON(),
        createContactInfoJSON(),
        createLatestNewsJSON(),
        createPrivacyPolicyJSON(),
        createTermsAndConditionsJSON(),
    ]);
};
