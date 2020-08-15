import { GuildMemberResolvable, Snowflake } from 'discord.js';

import { MongoCluster } from '../../mongoCluster';
import { GuildMemberObject, guildMemberSchema } from '../../schemas/main/guildMember';
import { LoadOptions } from '../../wrappers/docWrapper';
import { GuildMemberWrapper } from '../../wrappers/main/guildMemberWrapper';
import { GuildWrapper } from '../../wrappers/main/guildWrapper';
import { CacheManager } from '../cacheManager';
import { FetchOptions } from '../collectionManager';
import { GuildManager } from './guildManager';
import { UserManager, UserWrapperResolvable } from './userManager';
import { injectable, container } from 'tsyringe';

/**
 * Types that are resolvable to a GuildMemberWrapper
 */
export type GuildMemberWrapperResolvable = GuildMemberWrapper | GuildMemberResolvable;

/**
 * Holds the guildMember model
 *
 * @export
 * @class GuildMemberManager
 * @extends {CacheManager<GuildMemberObject, GuildMemberWrapper>}
 */
export class GuildMemberManager extends CacheManager<GuildMemberObject, typeof GuildMemberWrapper, GuildMemberManager> {

    /**
     * Guild of which members are being managed
     *
     * @type {GuildWrapper}
     * @memberof GuildMemberManager
     */
    readonly guild: GuildWrapper;

    private readonly userManager: UserManager;

    /**
     * Creates an instance of GuildMemberManager.
     * 
     * @param {GuildWrapper} guild Guild of which to manage members
     * @memberof GuildMemberManager
     */
    constructor(guild: GuildWrapper) {
        super(container.resolve(MongoCluster), 'main', 'guildMember', guildMemberSchema, true, GuildMemberWrapper);
        this.guild = guild;
        this.userManager = container.resolve(UserManager);
    }

    /**
     * Generates a default guildMember object with the provided user id
     *
     * @param {Snowflake} userId User id
     * @returns
     * @memberof GuildMemberManager
     */
    getDefaultObject(userId: Snowflake) {
        return {
            user: userId,
            guild: this.guild.id,
            commandLastUsed: {}
        };
    }

    /**
     * @param {Snowflake} userId User id
     * @returns
     * @memberof GuildMemberManager
     */
    getCacheKey(userId: Snowflake) {
        return userId;
    }

    /**
     * Returns GuildMemberWrapper saved in cache
     *
     * @param {UserWrapperResolvable} member Member in guild to search for
     * @param {LoadOptions<GuildMemberObject>} [options] LoadOptions that should be passed to the wrapper
     * @returns
     * @memberof GuildMemberManager
     */
    get(member: UserWrapperResolvable, options?: LoadOptions<GuildMemberObject>) {
        return this.getCached(options, this.userManager.resolveId(member));
    }

    /**
     * Searched the database and cache for a GuildMemberObject. 
     * If one isn't found and it's specified in the options a new GuildMemberObject is created
     *
     * @param {UserWrapperResolvable} member User in guild to search for
     * @param {FetchOptions<GuildMemberObject>} [options] Fetch options (include load options passed to wrapper)
     * @returns
     * @memberof GuildMemberManager
     */
    async fetch(member: UserWrapperResolvable, options?: FetchOptions<GuildMemberObject>) {
        let userWrapper = await this.userManager.resolve(member, true);
        if (!userWrapper) return undefined;
        let guildMember = await this.guild.members.resolve(userWrapper.user, true);
        if (!guildMember) return undefined;
        return this._fetch(
            [userWrapper.id],
            [guildMember, userWrapper, this.guild],
            [userWrapper.id],
            options
        );
    }

    /**
     * Resolves GuildMemberWrapperResolvable to a GuildMemberWrapper
     *
     * @param {GuildMemberWrapperResolvable} guildMember Resolvable to resolve
     * @param {boolean} [fetch=false] If not cached GuildWrappers should be fetched
     * @returns
     * @memberof GuildMemberManager
     */
    async resolve(guildMember: GuildMemberWrapperResolvable, fetch = false) {
        if (guildMember instanceof GuildMemberWrapper) return guildMember;
        if (fetch) return this.fetch(guildMember);
        return this.get(guildMember);
    }

    /**
     * Resolves GuildMemberWrapperResolvable to a guild member id
     *
     * @param {GuildMemberWrapperResolvable} guildMember Resolvable to resolve
     * @returns {Snowflake}
     * @memberof GuildMemberManager
     */
    resolveId(guildMember: GuildMemberWrapperResolvable): Snowflake {
        if (guildMember instanceof GuildMemberWrapper) return guildMember.id;
        return this.guild.guild.members.resolveID(guildMember);
    }

}